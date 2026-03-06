import io
import gc
import logging
from typing import Optional, Dict

import torch
import numpy as np
import soundfile as sf

from engines.base_engine import BaseEngine
from utils.audio_utils import normalize_text

logger = logging.getLogger("voxforge.engines.bark")


class BarkEngine(BaseEngine):
    """
    Suno Bark engine - generates speech, sound effects, music, and non-verbal audio.
    Supports foley/sound-effect generation from text prompts.
    """

    SAMPLE_RATE = 24000

    def __init__(self, device: Optional[str] = None, model_id: Optional[str] = None):
        super().__init__(
            device=device or ("cuda" if torch.cuda.is_available() else "cpu"),
            model_id=model_id or "suno/bark",
        )

    def get_capabilities(self) -> Dict[str, bool]:
        return {"clone": False, "design": False, "foley": True, "emotion": True, "speed": False}

    def load(self):
        if self._loaded:
            return
        logger.info(f"Loading Bark model: {self.model_id}")
        try:
            from transformers import AutoProcessor, BarkModel

            self._processor = AutoProcessor.from_pretrained(self.model_id)
            self._model = BarkModel.from_pretrained(
                self.model_id,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            )
            if self.device == "cuda":
                self._model = self._model.to("cuda")

            if os.environ.get("TTS_COMPILE", "0") == "1":
                logger.info("Compiling Bark model graph for optimized inference...")
                try:
                    self._model = torch.compile(self._model, mode="reduce-overhead")
                except Exception as compile_error:
                    logger.warning(f"torch.compile failed for Bark: {compile_error}")

            self._loaded = True
            logger.info("Bark model loaded successfully!")
        except Exception as e:
            logger.error(f"Failed to load Bark: {e}", exc_info=True)
            self._loaded = True
            self._model = None

    def unload(self):
        logger.info("Unloading Bark...")
        if self._model is not None:
            del self._model
            self._model = None
        if hasattr(self, "_processor"):
            del self._processor
            self._processor = None
        self._loaded = False
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    def generate_speech(self, text: str, embedding_path: str = "", **kwargs) -> bytes:
        self.load()
        if self._model is None:
            raise RuntimeError("Bark failed to load.")
            
        text = normalize_text(text)

        voice_preset = kwargs.get("voice_preset", "v2/en_speaker_6")
        inputs = self._processor(text, voice_preset=voice_preset, return_tensors="pt")
        if self.device == "cuda":
            inputs = {k: v.to("cuda") for k, v in inputs.items()}

        with torch.no_grad():
            audio_array = self._model.generate(**inputs)

        audio_array = audio_array.cpu().numpy().squeeze()

        buffer = io.BytesIO()
        sf.write(buffer, audio_array, self.SAMPLE_RATE, format="WAV")
        buffer.seek(0)
        return buffer.getvalue()

    def generate_foley(self, description: str, **kwargs) -> bytes:
        """Generate sound effects using Bark's unique ability to produce non-speech audio."""
        self.load()
        if self._model is None:
            raise RuntimeError("Bark failed to load.")

        # Bark uses special tokens for non-speech: [laughter], [music], etc.
        description = normalize_text(description)
        prompt = f"♪ {description} ♪"
        inputs = self._processor(prompt, return_tensors="pt")
        if self.device == "cuda":
            inputs = {k: v.to("cuda") for k, v in inputs.items()}

        with torch.no_grad():
            audio_array = self._model.generate(**inputs)

        audio_array = audio_array.cpu().numpy().squeeze()

        buffer = io.BytesIO()
        sf.write(buffer, audio_array, self.SAMPLE_RATE, format="WAV")
        buffer.seek(0)
        return buffer.getvalue()
