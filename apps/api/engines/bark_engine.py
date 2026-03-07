import io
import os
import gc
import logging
from typing import Optional, Dict

import torch
import numpy as np
import soundfile as sf

from engines.base_engine import BaseEngine
from utils.audio_utils import normalize_text

logger = logging.getLogger("resound-studio.engines.bark")


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
                dtype=torch.float16 if self.device == "cuda" else torch.float32,
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
            self._loaded = False
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

        # Map language to Bark's speaker presets
        language = kwargs.get("language", "English")
        lang_prefix_map = {
            "English": "v2/en", "Chinese": "v2/zh", "French": "v2/fr",
            "German": "v2/de", "Hindi": "v2/hi", "Italian": "v2/it",
            "Japanese": "v2/ja", "Korean": "v2/ko", "Portuguese": "v2/pt",
            "Russian": "v2/ru", "Spanish": "v2/es", "Turkish": "v2/tr",
        }
        lang_prefix = lang_prefix_map.get(language, "v2/en")

        # Map emotion to different Bark speaker IDs for variety
        emotion = kwargs.get("emotion", "neutral")
        emotion_speaker_map = {
            "neutral": 6, "happy": 1, "sad": 4, "angry": 8,
            "excited": 3, "calm": 0, "serious": 9, "whisper": 2,
        }
        speaker_num = emotion_speaker_map.get(emotion, 6)

        voice_preset = kwargs.get("voice_preset", f"{lang_prefix}_speaker_{speaker_num}")
        logger.info(f"Bark using voice preset: {voice_preset}")

        inputs = self._processor(text, voice_preset=voice_preset, return_tensors="pt")
        if self.device == "cuda":
            inputs = {k: v.to("cuda") for k, v in inputs.items()}

        with torch.inference_mode():
            audio_array = self._model.generate(
                **inputs,
                do_sample=True,
                fine_temperature=0.4,
                semantic_temperature=0.7,
                coarse_temperature=0.7,
                min_eos_p=0.05
            )

        audio_array = audio_array.cpu().numpy().squeeze().astype(np.float32)
        
        # Audio Post-processing to fix 'beep' and 'quality'
        audio_array = np.nan_to_num(audio_array)
        if np.abs(audio_array).max() > 0:
            audio_array = audio_array / np.abs(audio_array).max() * 0.95

        buffer = io.BytesIO()
        sf.write(buffer, audio_array, self.SAMPLE_RATE, format="WAV")
        buffer.seek(0)
        return buffer.getvalue()

    def generate_foley(self, description: str, **kwargs) -> bytes:
        """Generate sound effects using Bark's unique ability to produce non-speech audio."""
        self.load()
        if self._model is None:
            raise RuntimeError("Bark failed to load.")

        # Improved prompt for non-speech audio
        description = normalize_text(description)
        prompt = f"[audio] {description}"
        inputs = self._processor(prompt, return_tensors="pt")
        if self.device == "cuda":
            inputs = {k: v.to("cuda") for k, v in inputs.items()}

        with torch.inference_mode():
            audio_array = self._model.generate(
                **inputs,
                do_sample=True,
                fine_temperature=0.3, # Slightly lower for foley stability
                semantic_temperature=0.8,
                coarse_temperature=0.8,
                min_eos_p=0.1
            )

        audio_array = audio_array.cpu().numpy().squeeze().astype(np.float32)

        # Audio Post-processing to fix 'beep' and 'quality'
        audio_array = np.nan_to_num(audio_array)
        if np.abs(audio_array).max() > 0:
            audio_array = audio_array / np.abs(audio_array).max() * 0.95

        buffer = io.BytesIO()
        sf.write(buffer, audio_array, self.SAMPLE_RATE, format="WAV")
        buffer.seek(0)
        return buffer.getvalue()
