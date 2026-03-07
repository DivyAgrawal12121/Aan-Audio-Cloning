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

logger = logging.getLogger("resound-studio.engines.cosyvoice")


class CosyVoiceEngine(BaseEngine):
    """
    CosyVoice v2 engine - state-of-the-art emotional control and cross-lingual dubbing.
    Clone a voice in English and make it speak fluent Japanese/Hindi/French.
    """

    SAMPLE_RATE = 22050

    def __init__(self, device: Optional[str] = None, model_id: Optional[str] = None):
        super().__init__(
            device=device or ("cuda" if torch.cuda.is_available() else "cpu"),
            model_id=model_id or "FunAudioLLM/CosyVoice2-0.5B",
        )

    def get_capabilities(self) -> Dict[str, bool]:
        return {"clone": True, "design": False, "foley": False, "emotion": True, "cross_lingual": True, "speed": True}

    def load(self):
        if self._loaded:
            return
        logger.info(f"Loading CosyVoice: {self.model_id}")
        try:
            from cosyvoice import CosyVoice2

            self._model = CosyVoice2(self.model_id, load_jit=False, load_trt=False)
            self._loaded = True
            logger.info("CosyVoice loaded successfully!")
        except Exception as e:
            logger.error(f"Failed to load CosyVoice: {e}", exc_info=True)
            self._loaded = False
            self._model = None

    def unload(self):
        logger.info("Unloading CosyVoice...")
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
            raise RuntimeError("CosyVoice failed to load.")

        # Store reference text and engine marker in the embedding.
        # The actual audio is saved as sample.wav by voice_store.save_voice(),
        # so we DON'T store a temp file path (it would get deleted by the OS).
        prompt_bytes = io.BytesIO()
        torch.save({"ref_text": ref_text, "engine": "cosyvoice"}, prompt_bytes)
        return {
            "prompt_bytes": prompt_bytes.getvalue(),
            "sample_rate": self.SAMPLE_RATE,
        }

    def generate_speech(self, text: str, embedding_path: str, **kwargs) -> bytes:
        self.load()
        if self._model is None:
            raise RuntimeError("CosyVoice failed to load.")

        language = kwargs.get("language", "English")
        emotion = kwargs.get("emotion", "neutral")

        prompt_data = None
        try:
            prompt_data = torch.load(embedding_path, map_location="cpu", weights_only=False)
        except Exception:
            pass

        ref_text = ""
        if isinstance(prompt_data, dict):
            ref_text = prompt_data.get("ref_text", "")

        ref_audio = embedding_path.replace("embedding.pt", "sample.wav")
        if not os.path.exists(ref_audio) and isinstance(prompt_data, dict):
            ref_audio = prompt_data.get("ref_audio_path", "")

        if not ref_audio or not os.path.exists(ref_audio):
            raise RuntimeError(f"Reference audio not found for CosyVoice voice. Expected: {ref_audio}")
        
        text = normalize_text(text)

        instruct = text
        if emotion and emotion != "neutral":
            instruct = f"[{emotion}] {text}"

        all_audio = []
        for result in self._model.inference_zero_shot(instruct, ref_text, ref_audio, stream=False):
            audio_chunk = result["tts_speech"].numpy().squeeze()
            all_audio.append(audio_chunk)

        combined = np.concatenate(all_audio) if all_audio else np.zeros(self.SAMPLE_RATE)
        buffer = io.BytesIO()
        sf.write(buffer, combined, self.SAMPLE_RATE, format="WAV")
        buffer.seek(0)
        return buffer.getvalue()

    def cross_lingual_clone(self, audio_bytes: bytes, text: str, source_lang: str, target_lang: str, **kwargs) -> bytes:
        """Clone voice from source language and generate in target language."""
        self.load()
        if self._model is None:
            raise RuntimeError("CosyVoice failed to load.")
            
        text = normalize_text(text)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name
            audio_data, sr = sf.read(io.BytesIO(audio_bytes))
            if len(audio_data.shape) > 1:
                audio_data = audio_data.mean(axis=1)
            sf.write(tmp_path, audio_data, sr)

        try:
            all_audio = []
            for result in self._model.inference_cross_lingual(text, tmp_path, stream=False):
                audio_chunk = result["tts_speech"].numpy().squeeze()
                all_audio.append(audio_chunk)

            combined = np.concatenate(all_audio) if all_audio else np.zeros(self.SAMPLE_RATE)
            buffer = io.BytesIO()
            sf.write(buffer, combined, self.SAMPLE_RATE, format="WAV")
            buffer.seek(0)
            return buffer.getvalue()
        finally:
            os.unlink(tmp_path)
