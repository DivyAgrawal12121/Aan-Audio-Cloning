import io
import os
import gc
import logging
from typing import Optional, Dict

import torch
import numpy as np
import soundfile as sf

from engines.base_engine import BaseEngine

logger = logging.getLogger("voxforge.engines.qwen_design")


class QwenDesignEngine(BaseEngine):
    """
    Qwen3-TTS VoiceDesign model - specialized for creating new voices from descriptions.
    """

    SAMPLE_RATE = 24000

    def __init__(self, device: Optional[str] = None, model_id: Optional[str] = None):
        super().__init__(
            device=device or ("cuda" if torch.cuda.is_available() else "cpu"),
            model_id=model_id or "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        )
        self._load_failed = False

    def get_capabilities(self) -> Dict[str, bool]:
        return {"clone": False, "design": True, "foley": False, "emotion": True, "speed": True}

    def load(self):
        if self._loaded:
            return
        logger.info(f"Loading Qwen3-TTS VoiceDesign: {self.model_id}")
        try:
            from qwen_tts import Qwen3TTSModel
            dtype = torch.bfloat16 if self.device == "cuda" else torch.float32
            device_map = "cuda:0" if self.device == "cuda" else "cpu"
            self._model = Qwen3TTSModel.from_pretrained(self.model_id, device_map=device_map, dtype=dtype)
            self._loaded = True
            logger.info("Qwen3-TTS VoiceDesign loaded successfully!")
        except Exception as e:
            logger.error(f"Failed to load Qwen VoiceDesign: {e}", exc_info=True)
            self._loaded = True
            self._load_failed = True

    def unload(self):
        logger.info("Unloading Qwen3-TTS VoiceDesign...")
        if self._model is not None:
            del self._model
            self._model = None
        self._loaded = False
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    def design_voice(self, description: str, text: str, **kwargs) -> bytes:
        self.load()
        if self._load_failed or not self._model:
            raise RuntimeError("Qwen VoiceDesign failed to load.")

        language = kwargs.get("language", "English")
        logger.info(f"Designing voice: {description[:50]}...")

        wavs, sr = self._model.generate(
            text=text,
            language=language,
            voice_description=description,
        )

        audio_array = wavs[0]
        if isinstance(audio_array, torch.Tensor):
            audio_array = audio_array.cpu().numpy()

        buffer = io.BytesIO()
        sf.write(buffer, audio_array, sr, format="WAV")
        buffer.seek(0)
        return buffer.getvalue()

    def generate_speech(self, text: str, embedding_path: str, **kwargs) -> bytes:
        self.load()
        if self._load_failed or not self._model:
            raise RuntimeError("Qwen VoiceDesign failed to load.")

        language = kwargs.get("language", "English")
        fallback_path = os.path.abspath(os.path.join("data", "fallback.wav"))
        wavs, sr = self._model.generate_voice_clone(
            text=text,
            language=language,
            ref_audio=fallback_path if os.path.exists(fallback_path) else None,
            ref_text="Hello, this is a test.",
            x_vector_only_mode=True,
        )

        audio_array = wavs[0]
        if isinstance(audio_array, torch.Tensor):
            audio_array = audio_array.cpu().numpy()

        buffer = io.BytesIO()
        sf.write(buffer, audio_array, sr, format="WAV")
        buffer.seek(0)
        return buffer.getvalue()
