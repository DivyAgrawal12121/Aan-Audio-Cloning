import io
import gc
import logging
from typing import Optional, Dict

import torch
import numpy as np
import soundfile as sf

from engines.base_engine import BaseEngine

logger = logging.getLogger("voxforge.engines.parler")


class ParlerEngine(BaseEngine):
    """
    Parler-TTS engine - prompt-based voice design.
    Type a description like "A young woman speaks softly in a quiet room" to create a new voice.
    """

    SAMPLE_RATE = 44100  # Parler outputs at 44.1kHz

    def __init__(self, device: Optional[str] = None, model_id: Optional[str] = None):
        super().__init__(
            device=device or ("cuda" if torch.cuda.is_available() else "cpu"),
            model_id=model_id or "parler-tts/parler-tts-large-v1",
        )

    def get_capabilities(self) -> Dict[str, bool]:
        return {"clone": False, "design": True, "foley": False, "emotion": True, "speed": False}

    def load(self):
        if self._loaded:
            return
        logger.info(f"Loading Parler-TTS: {self.model_id}")
        try:
            from parler_tts import ParlerTTSForConditionalGeneration
            from transformers import AutoTokenizer

            self._model = ParlerTTSForConditionalGeneration.from_pretrained(
                self.model_id,
                torch_dtype=torch.bfloat16 if self.device == "cuda" else torch.float32,
            )
            if self.device == "cuda":
                self._model = self._model.to("cuda")

            self._tokenizer = AutoTokenizer.from_pretrained(self.model_id)
            self._loaded = True
            logger.info("Parler-TTS loaded successfully!")
        except Exception as e:
            logger.error(f"Failed to load Parler-TTS: {e}", exc_info=True)
            self._loaded = True
            self._model = None

    def unload(self):
        logger.info("Unloading Parler-TTS...")
        if self._model is not None:
            del self._model
            self._model = None
        if hasattr(self, "_tokenizer"):
            del self._tokenizer
        self._loaded = False
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    def design_voice(self, description: str, text: str, **kwargs) -> bytes:
        """Generate speech using a text description of the desired voice."""
        self.load()
        if self._model is None:
            raise RuntimeError("Parler-TTS failed to load.")

        logger.info(f"Designing voice: {description[:60]}...")

        input_ids = self._tokenizer(description, return_tensors="pt").input_ids
        prompt_input_ids = self._tokenizer(text, return_tensors="pt").input_ids

        if self.device == "cuda":
            input_ids = input_ids.to("cuda")
            prompt_input_ids = prompt_input_ids.to("cuda")

        with torch.no_grad():
            generation = self._model.generate(
                input_ids=input_ids,
                prompt_input_ids=prompt_input_ids,
            )

        audio_array = generation.cpu().numpy().squeeze()

        buffer = io.BytesIO()
        sf.write(buffer, audio_array, self.SAMPLE_RATE, format="WAV")
        buffer.seek(0)
        return buffer.getvalue()

    def generate_speech(self, text: str, embedding_path: str = "", **kwargs) -> bytes:
        """Generate speech with a default voice description."""
        description = kwargs.get("voice_description", "A clear, neutral male voice speaks in a quiet recording studio.")
        return self.design_voice(description=description, text=text, **kwargs)
