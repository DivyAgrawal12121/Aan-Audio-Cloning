import io
import gc
import logging
import tempfile
import os
from typing import Optional, Dict

import torch
import numpy as np
import soundfile as sf

from engines.base_engine import BaseEngine
from utils.audio_utils import normalize_text

logger = logging.getLogger("voxforge.engines.xtts")


class XTTSEngine(BaseEngine):
    """
    XTTS v2 (Coqui) engine - cross-lingual voice cloning.
    Record in English, speak in 17+ languages. Battle-tested and reliable.
    """

    SAMPLE_RATE = 24000

    def __init__(self, device: Optional[str] = None, model_id: Optional[str] = None):
        super().__init__(
            device=device or ("cuda" if torch.cuda.is_available() else "cpu"),
            model_id=model_id or "tts_models/multilingual/multi-dataset/xtts_v2",
        )

    def get_capabilities(self) -> Dict[str, bool]:
        return {"clone": True, "design": False, "foley": False, "emotion": False, "cross_lingual": True, "speed": True}

    def load(self):
        if self._loaded:
            return
        logger.info(f"Loading XTTS v2: {self.model_id}")
        try:
            from TTS.api import TTS

            self._model = TTS(self.model_id)
            if self.device == "cuda":
                self._model = self._model.to("cuda")
            self._loaded = True
            logger.info("XTTS v2 loaded successfully!")
        except Exception as e:
            logger.error(f"Failed to load XTTS v2: {e}", exc_info=True)
            self._loaded = True
            self._model = None

    def unload(self):
        logger.info("Unloading XTTS v2...")
        if self._model is not None:
            del self._model
            self._model = None
        self._loaded = False
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    def clone_voice(self, audio_bytes: bytes, ref_text: str = "") -> dict:
        self.load()
        if self._model is None:
            raise RuntimeError("XTTS v2 failed to load.")

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name
            audio_data, sr = sf.read(io.BytesIO(audio_bytes))
            if len(audio_data.shape) > 1:
                audio_data = audio_data.mean(axis=1)
            sf.write(tmp_path, audio_data, sr)

        prompt_bytes = io.BytesIO()
        torch.save({"ref_audio_path": tmp_path, "ref_text": ref_text, "engine": "xtts"}, prompt_bytes)
        return {
            "prompt_bytes": prompt_bytes.getvalue(),
            "sample_rate": self.SAMPLE_RATE,
        }

    def generate_speech(self, text: str, embedding_path: str, **kwargs) -> bytes:
        self.load()
        if self._model is None:
            raise RuntimeError("XTTS v2 failed to load.")
            
        text = normalize_text(text)

        language = kwargs.get("language", "en")
        # Map common language names to XTTS codes
        lang_map = {
            "English": "en", "French": "fr", "Spanish": "es",
            "German": "de", "Italian": "it", "Portuguese": "pt",
            "Japanese": "ja", "Chinese": "zh-cn", "Hindi": "hi",
            "Korean": "ko", "Arabic": "ar", "Turkish": "tr",
        }
        lang_code = lang_map.get(language, language.lower()[:2])

        prompt_data = torch.load(embedding_path, map_location="cpu", weights_only=False)
        ref_audio = prompt_data.get("ref_audio_path", "")

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out_tmp:
            out_path = out_tmp.name

        try:
            self._model.tts_to_file(
                text=text,
                speaker_wav=ref_audio,
                language=lang_code,
                file_path=out_path,
            )
            with open(out_path, "rb") as f:
                return f.read()
        finally:
            if os.path.exists(out_path):
                os.unlink(out_path)

    def cross_lingual_clone(self, audio_bytes: bytes, text: str, source_lang: str, target_lang: str, **kwargs) -> bytes:
        """Clone voice and generate in a different language."""
        self.load()
        if self._model is None:
            raise RuntimeError("XTTS v2 failed to load.")
            
        text = normalize_text(text)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name
            audio_data, sr = sf.read(io.BytesIO(audio_bytes))
            if len(audio_data.shape) > 1:
                audio_data = audio_data.mean(axis=1)
            sf.write(tmp_path, audio_data, sr)

        lang_map = {
            "English": "en", "French": "fr", "Spanish": "es",
            "German": "de", "Italian": "it", "Portuguese": "pt",
            "Japanese": "ja", "Chinese": "zh-cn", "Hindi": "hi",
        }
        lang_code = lang_map.get(target_lang, target_lang.lower()[:2])

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out_tmp:
            out_path = out_tmp.name

        try:
            self._model.tts_to_file(
                text=text,
                speaker_wav=tmp_path,
                language=lang_code,
                file_path=out_path,
            )
            with open(out_path, "rb") as f:
                return f.read()
        finally:
            os.unlink(tmp_path)
            if os.path.exists(out_path):
                os.unlink(out_path)
