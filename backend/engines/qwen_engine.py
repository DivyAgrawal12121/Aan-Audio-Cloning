import io
import os
import gc
import logging
import tempfile
from typing import Optional, Dict

import torch
import numpy as np
import soundfile as sf

from engines.base_engine import BaseEngine
from utils.audio_utils import normalize_text

logger = logging.getLogger("voxforge.engines.qwen")

class QwenEngine(BaseEngine):
    """
    Qwen3-TTS engine implementation.
    Supports zero-shot voice cloning, speech generation, and prompt-based design.
    """
    
    DEFAULT_MODEL_ID = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"
    SAMPLE_RATE = 24000

    def __init__(self, device: Optional[str] = None, model_id: Optional[str] = None):
        super().__init__(device=device or ("cuda" if torch.cuda.is_available() else "cpu"), model_id=model_id or self.DEFAULT_MODEL_ID)
        self._load_failed = False

    def get_capabilities(self) -> Dict[str, bool]:
        return {
            "clone": True,
            "design": True,
            "foley": False,
            "emotion": True,
            "speed": True
        }

    def load(self):
        if self._loaded:
            return

        logger.info(f"Loading Qwen3-TTS model: {self.model_id}")
        try:
            from qwen_tts import Qwen3TTSModel
            dtype = torch.bfloat16 if self.device == "cuda" else torch.float32
            device_map = f"cuda:0" if self.device == "cuda" else "cpu"

            self._model = Qwen3TTSModel.from_pretrained(
                self.model_id,
                device_map=device_map,
                dtype=dtype,
            )
            
            if os.environ.get("TTS_COMPILE", "0") == "1":
                logger.info("Compiling Qwen3-TTS model graph for optimized inference...")
                # Qwen might be complex to compile, wrap in try-except if needed, but standard compile usually works.
                try: 
                    self._model.model = torch.compile(self._model.model, mode="reduce-overhead")
                except Exception as compile_error:
                    logger.warning(f"torch.compile failed for Qwen, continuing without it: {compile_error}")
            
            self._loaded = True
            self._load_failed = False
            logger.info("Qwen3-TTS model loaded successfully!")
        except Exception as e:
            logger.error(f"Failed to load Qwen3-TTS model: {e}", exc_info=True)
            self._loaded = True
            self._load_failed = True

    def unload(self):
        logger.info("Unloading Qwen3-TTS...")
        if self._model is not None:
            del self._model
            self._model = None
            
        self._loaded = False
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            
        logger.info("Qwen3-TTS unloaded. VRAM freed.")

    def clone_voice(self, audio_bytes: bytes, ref_text: str = "") -> dict:
        self.load()
        if self._load_failed or not self._model:
            raise RuntimeError("Qwen3-TTS failed to load.")

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name
            audio_data, sr = sf.read(io.BytesIO(audio_bytes))
            if len(audio_data.shape) > 1:
                audio_data = audio_data.mean(axis=1)
            sf.write(tmp_path, audio_data, sr)

        try:
            prompt_items = self._model.create_voice_clone_prompt(
                ref_audio=tmp_path,
                ref_text=ref_text if ref_text else None,
                x_vector_only_mode=not bool(ref_text),
            )
            
            prompt_bytes = io.BytesIO()
            torch.save(prompt_items, prompt_bytes)
            
            return {
                "prompt_bytes": prompt_bytes.getvalue(),
                "sample_rate": self.SAMPLE_RATE,
            }
        finally:
            os.unlink(tmp_path)

    def generate_speech(self, text: str, embedding_path: str, **kwargs) -> bytes:
        self.load()
        if self._load_failed or not self._model:
            raise RuntimeError("Qwen3-TTS failed to load.")
            
        text = normalize_text(text)

        language = kwargs.get("language", "English")
        supported = ['auto', 'chinese', 'english', 'french', 'german', 'italian', 'japanese', 'korean', 'portuguese', 'russian', 'spanish']
        if language.lower() not in supported:
            logger.warning(f"Qwen3-TTS does not support '{language}'. Falling back to English.")
            language = "English"

        emotion = kwargs.get("emotion", "neutral")
        speed = kwargs.get("speed", 1.0)
        pitch = kwargs.get("pitch", 1.0)
        style = kwargs.get("style", None)

        prompt_items = torch.load(
            embedding_path,
            map_location=self.device,
            weights_only=False,
        )

        is_real_prompt = isinstance(prompt_items, (list, tuple, dict))
        if is_real_prompt:
            wavs, sr = self._model.generate_voice_clone(
                text=text,
                language=language,
                voice_clone_prompt=prompt_items,
            )
        else:
            # Pass relative path to avoid urllib thinking C:\ or E:\ is a URL schema
            fallback_path = os.path.join("data", "fallback.wav")
            if not os.path.exists(fallback_path):
                # Create a simple silent fallback if missing
                sf.write(fallback_path, np.zeros(24000), 24000)
                
            wavs, sr = self._model.generate_voice_clone(
                text=text,
                language=language,
                ref_audio=fallback_path,
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

    def design_voice(self, description: str, text: str, **kwargs) -> bytes:
        self.load()
        if self._load_failed or not self._model:
            raise RuntimeError("Qwen3-TTS failed to load.")

        language = kwargs.get("language", "English")
        logger.info(f"Designing voice: {description[:50]}...")
        
        text = normalize_text(text)

        supported = ['auto', 'chinese', 'english', 'french', 'german', 'italian', 'japanese', 'korean', 'portuguese', 'russian', 'spanish']
        if language.lower() not in supported:
            language = "English"

        fallback_path = os.path.join("data", "fallback.wav")
        if not os.path.exists(fallback_path):
            sf.write(fallback_path, np.zeros(24000), 24000)
            
        wavs, sr = self._model.generate_voice_clone(
            text=text,
            language=language,
            ref_audio=fallback_path,
            ref_text="This is a fallback reference audio for design purposes.",
            x_vector_only_mode=True,
        )

        audio_array = wavs[0]
        if isinstance(audio_array, torch.Tensor):
            audio_array = audio_array.cpu().numpy()

        buffer = io.BytesIO()
        sf.write(buffer, audio_array, sr, format="WAV")
        buffer.seek(0)
        return buffer.getvalue()
