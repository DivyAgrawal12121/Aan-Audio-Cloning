import io
import os
import gc
import logging
from typing import Optional, Dict

import torch
import numpy as np
import soundfile as sf

import tempfile

from engines.base_engine import BaseEngine
from utils.audio_utils import (
    normalize_text,
    load_audio_bytes,
    normalize_audio,
    validate_reference_audio,
)

logger = logging.getLogger("resound-studio.engines.qwen_design")


class QwenDesignEngine(BaseEngine):
    """
    Qwen3-TTS VoiceDesign model - specialized for creating new voices from descriptions.
    Uses the dedicated VoiceDesign model that actually supports text-description-based
    voice generation (unlike the Base model which needs reference audio).
    """

    DEFAULT_MODEL_ID = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"
    SAMPLE_RATE = 24000

    def __init__(self, device: Optional[str] = None, model_id: Optional[str] = None):
        super().__init__(
            device=device or ("cuda" if torch.cuda.is_available() else "cpu"),
            model_id=model_id or "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        )
        self._load_failed = False

    def get_capabilities(self) -> Dict[str, bool]:
        return {
            "clone": True,
            "design": True,
            "foley": False,
            "emotion": True,
            "speed": True,
            "seed": True,
        }

    def load(self):
        if self._loaded:
            return
        logger.info(f"Loading Qwen3-TTS VoiceDesign: {self.model_id}")
        try:
            from qwen_tts import Qwen3TTSModel
            dtype = torch.bfloat16 if self.device == "cuda" else torch.float32
            device_map = f"cuda:0" if self.device == "cuda" else "cpu"

            self._model = Qwen3TTSModel.from_pretrained(
                self.model_id,
                device_map=device_map,
                dtype=dtype,
            )
            self._loaded = True
            logger.info("Qwen3-TTS VoiceDesign loaded successfully!")
        except Exception as e:
            logger.error(f"Failed to load Qwen VoiceDesign: {e}", exc_info=True)
            self._loaded = False
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

    def clone_voice(self, audio_bytes: bytes, ref_text: str = "") -> dict:
        """
        Extract a reusable voice prompt from audio bytes.
        """
        self.load()
        if self._load_failed or not self._model:
            raise RuntimeError("Qwen VoiceDesign failed to load.")

        is_valid, error_msg = validate_reference_audio(audio_bytes=audio_bytes)
        if not is_valid:
            logger.warning(f"Reference audio validation warning: {error_msg}")

        audio_data, sr = load_audio_bytes(audio_bytes, sample_rate=self.SAMPLE_RATE)
        if len(audio_data.shape) > 1:
            audio_data = audio_data.mean(axis=1)
        
        audio_data = normalize_audio(audio_data)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name
            sf.write(tmp_path, audio_data, self.SAMPLE_RATE)

        try:
            if not ref_text:
                ref_text = self._auto_transcribe(tmp_path)

            prompt_items = self._model.create_voice_clone_prompt(
                ref_audio=tmp_path,
                ref_text=ref_text if ref_text else None,
                x_vector_only_mode=False,
            )
            
            prompt_bytes = io.BytesIO()
            torch.save(prompt_items, prompt_bytes)
            
            return {
                "prompt_bytes": prompt_bytes.getvalue(),
                "sample_rate": self.SAMPLE_RATE,
                "reference_text": ref_text,
            }
        finally:
            os.unlink(tmp_path)

    def _auto_transcribe(self, audio_path: str) -> str:
        try:
            import whisper
            model = whisper.load_model("base")
            result = model.transcribe(audio_path, language=None)
            text = result.get("text", "").strip()
            if text:
                return text
        except ImportError:
            logger.info("Whisper not installed - using fallback reference text.")
        except Exception as e:
            logger.warning(f"Whisper transcription failed: {e}")
        return "This is a reference audio sample for voice cloning."

    def design_voice(self, description: str, text: str, **kwargs) -> bytes:
        """
        Design a voice from a text description using the VoiceDesign model.
        This is the PROPER way to create voices from descriptions — it uses
        the dedicated VoiceDesign model that supports voice_description parameter.
        """
        self.load()
        if self._load_failed or not self._model:
            raise RuntimeError("Qwen VoiceDesign failed to load.")

        language = kwargs.get("language", "English")
        supported = ['auto', 'chinese', 'english', 'french', 'german', 'italian', 'japanese', 'korean', 'portuguese', 'russian', 'spanish']
        if language.lower() not in supported:
            language = "English"

        seed = kwargs.get("seed", None)
        if seed is not None:
            torch.manual_seed(seed)
            if torch.cuda.is_available():
                torch.cuda.manual_seed(seed)
            np.random.seed(seed)

        logger.info(f"Designing voice: {description[:50]}...")
        text = normalize_text(text)

        # Use the VoiceDesign model's generate_voice_design method
        # instruct = the voice description that controls voice characteristics
        wavs, sr = self._model.generate_voice_design(
            text=text,
            instruct=description,
            language=language,
        )

        audio_array = wavs[0]
        if isinstance(audio_array, torch.Tensor):
            audio_array = audio_array.to(torch.float32).cpu().numpy()
        else:
            audio_array = np.array(audio_array, dtype=np.float32)

        if audio_array.ndim > 1:
            audio_array = audio_array.squeeze()

        buffer = io.BytesIO()
        sf.write(buffer, audio_array, sr, format="WAV")
        buffer.seek(0)
        return buffer.getvalue()

    def generate_speech(self, text: str, embedding_path: str, **kwargs) -> bytes:
        """
        Generate speech using a saved voice prompt.
        For the VoiceDesign model, this loads a cached prompt from a previous design.
        """
        self.load()
        if self._load_failed or not self._model:
            raise RuntimeError("Qwen VoiceDesign failed to load.")

        language = kwargs.get("language", "English")
        supported = ['auto', 'chinese', 'english', 'french', 'german', 'italian', 'japanese', 'korean', 'portuguese', 'russian', 'spanish']
        if language.lower() not in supported:
            language = "English"

        text = normalize_text(text)

        seed = kwargs.get("seed", None)
        if seed is not None:
            torch.manual_seed(seed)
            if torch.cuda.is_available():
                torch.cuda.manual_seed(seed)
            np.random.seed(seed)

        # Try to load voice prompt from embedding file.
        # If it's pure UTF-8 text, it's a designed voice description.
        try:
            prompt_items = torch.load(
                embedding_path,
                map_location=self.device,
                weights_only=False,
            )
        except Exception:
            # If torch.load fails, try reading as raw text
            with open(embedding_path, "r", encoding="utf-8") as f:
                prompt_items = f.read().strip()

        is_real_prompt = isinstance(prompt_items, (list, tuple, dict))
        if is_real_prompt:
            wavs, sr = self._model.generate_voice_clone(
                text=text,
                language=language,
                voice_clone_prompt=prompt_items,
            )
        else:
            # Fallback: generating using voice description (prompt_items is the description text)
            instruct_text = prompt_items if isinstance(prompt_items, str) and prompt_items else "A clear, natural speaking voice with moderate pace."
            logger.info(f"Generating using voice description: {instruct_text[:50]}...")
            wavs, sr = self._model.generate_voice_design(
                text=text,
                instruct=instruct_text,
                language=language,
            )

        audio_array = wavs[0]
        if isinstance(audio_array, torch.Tensor):
            audio_array = audio_array.to(torch.float32).cpu().numpy()
        else:
            audio_array = np.array(audio_array, dtype=np.float32)

        if audio_array.ndim > 1:
            audio_array = audio_array.squeeze()

        buffer = io.BytesIO()
        sf.write(buffer, audio_array, sr, format="WAV")
        buffer.seek(0)
        return buffer.getvalue()
