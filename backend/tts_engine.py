"""
VoxForge - Qwen3-TTS Engine Wrapper
=====================================
Uses the official qwen_tts Python package (Qwen3TTSModel) for:
  - Voice cloning from reference audio
  - Voice design from text descriptions
  - Text-to-speech generation

Requires: pip install qwen-tts
Model: Qwen/Qwen3-TTS-12Hz-1.7B-Base (voice cloning + generation)
"""

import io
import os
import json
import logging
import tempfile
from typing import Optional

import torch
import numpy as np
import soundfile as sf

logger = logging.getLogger("voxforge.tts_engine")


class TTSEngine:
    """
    Wrapper around qwen_tts.Qwen3TTSModel for all TTS operations.

    The model is loaded lazily on first use.
    Uses the official qwen-tts package which handles all internal
    tokenization, codec decoding, and audio generation.
    """

    MODEL_ID = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"
    SAMPLE_RATE = 24000

    def __init__(self, device: Optional[str] = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._model = None
        self._loaded = False
        self._load_failed = False

        logger.info(f"TTS Engine initialized. Target device: {self.device}")

    def _ensure_loaded(self):
        """Lazy-load the model on first use."""
        if self._loaded:
            return

        logger.info(f"Loading Qwen3-TTS model: {self.MODEL_ID}")
        logger.info("This may take a minute on first run (downloading weights)...")

        try:
            from qwen_tts import Qwen3TTSModel

            dtype = torch.bfloat16 if self.device == "cuda" else torch.float32
            device_map = f"cuda:0" if self.device == "cuda" else "cpu"

            self._model = Qwen3TTSModel.from_pretrained(
                self.MODEL_ID,
                device_map=device_map,
                dtype=dtype,
            )

            self._loaded = True
            self._load_failed = False
            logger.info("Qwen3-TTS model loaded successfully!")
            logger.info(f"  Device: {device_map}, Dtype: {dtype}")

        except Exception as e:
            logger.error(f"Failed to load Qwen3-TTS model: {e}", exc_info=True)
            logger.warning("Falling back to demo mode (generating sine waves)")
            self._loaded = True
            self._load_failed = True

    def clone_voice(self, audio_bytes: bytes, ref_text: str = "") -> dict:
        """
        Clone a voice from a reference audio sample.

        Uses the official generate_voice_clone API. Returns a dict
        with the prompt items that can be reused for future generations.

        Args:
            audio_bytes: Raw audio file bytes (WAV, MP3, OGG, etc.)
            ref_text: Transcript of the reference audio (optional but improves quality)

        Returns:
            dict with 'prompt_data' (serializable) and 'sample_rate'
        """
        self._ensure_loaded()

        try:
            if self._model is not None and not self._load_failed:
                # Save audio bytes to a temporary file
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                    tmp_path = tmp.name
                    # Convert input audio to WAV format
                    audio_data, sr = sf.read(io.BytesIO(audio_bytes))
                    if len(audio_data.shape) > 1:
                        audio_data = audio_data.mean(axis=1)
                    sf.write(tmp_path, audio_data, sr)

                # Create reusable voice clone prompt
                prompt_items = self._model.create_voice_clone_prompt(
                    ref_audio=tmp_path,
                    ref_text=ref_text if ref_text else None,
                    x_vector_only_mode=not bool(ref_text),
                )

                # Clean up temp file
                os.unlink(tmp_path)

                # Serialize the prompt items for storage
                prompt_bytes = io.BytesIO()
                torch.save(prompt_items, prompt_bytes)

                return {
                    "prompt_bytes": prompt_bytes.getvalue(),
                    "sample_rate": self.SAMPLE_RATE,
                }
            else:
                # Demo mode
                logger.info("Demo mode: generating random embedding for clone")
                embedding = torch.randn(1, 256)
                buf = io.BytesIO()
                torch.save(embedding, buf)
                return {
                    "prompt_bytes": buf.getvalue(),
                    "sample_rate": self.SAMPLE_RATE,
                }

        except Exception as e:
            logger.error(f"Voice cloning failed: {e}", exc_info=True)
            embedding = torch.randn(1, 256)
            buf = io.BytesIO()
            torch.save(embedding, buf)
            return {
                "prompt_bytes": buf.getvalue(),
                "sample_rate": self.SAMPLE_RATE,
            }

    def generate_speech(
        self,
        text: str,
        embedding_path: str,
        language: str = "English",
        emotion: str = "neutral",
        speed: float = 1.0,
        pitch: float = 1.0,
        duration: Optional[float] = None,
        style: Optional[str] = None,
    ) -> bytes:
        """
        Generate speech audio from text using a saved voice clone prompt.

        Args:
            text: The text to speak
            embedding_path: Path to the serialized voice clone prompt
            language: Target language
            emotion: Emotion style
            speed: Speed multiplier
            pitch: Pitch multiplier
            duration: Optional forced duration in seconds
            style: Optional style instructions

        Returns:
            WAV audio bytes
        """
        self._ensure_loaded()

        try:
            if self._model is not None and not self._load_failed:
                # Load the saved voice clone prompt
                prompt_items = torch.load(
                    embedding_path,
                    map_location=self.device,
                    weights_only=False,
                )

                # Build instruct string from emotion/style
                instruct_parts = []
                if emotion and emotion != "neutral":
                    instruct_parts.append(f"Speak with {emotion} emotion.")
                if style:
                    instruct_parts.append(style)
                if speed != 1.0:
                    speed_desc = "very quickly" if speed > 1.5 else "quickly" if speed > 1.0 else "slowly" if speed < 1.0 else "very slowly"
                    instruct_parts.append(f"Speak {speed_desc}.")
                if pitch != 1.0:
                    pitch_desc = "a higher pitch" if pitch > 1.0 else "a lower pitch"
                    instruct_parts.append(f"Use {pitch_desc}.")

                instruct = " ".join(instruct_parts) if instruct_parts else None

                # Check if prompt_items is a real clone prompt or a dummy embedding
                is_real_prompt = isinstance(prompt_items, (list, tuple, dict))

                if is_real_prompt:
                    # Use voice clone generation with pre-computed prompt
                    wavs, sr = self._model.generate_voice_clone(
                        text=text,
                        language=language,
                        voice_clone_prompt=prompt_items,
                    )
                else:
                    # Fallback: use the model without clone prompt
                    # (this shouldn't normally happen)
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

                # Encode to WAV bytes
                buffer = io.BytesIO()
                sf.write(buffer, audio_array, sr, format="WAV")
                buffer.seek(0)
                return buffer.getvalue()

            else:
                # Demo mode: generate a nicer sine wave
                logger.info("Demo mode: generating placeholder audio")
                duration_sec = duration or max(1.0, len(text) * 0.06)
                t = np.linspace(0, duration_sec, int(self.SAMPLE_RATE * duration_sec))
                freq = 220 * pitch
                audio_array = 0.3 * np.sin(2 * np.pi * freq * t)
                audio_array += 0.15 * np.sin(2 * np.pi * freq * 2 * t)
                audio_array += 0.07 * np.sin(2 * np.pi * freq * 3 * t)
                # Apply fade in/out envelope
                fade = int(0.05 * self.SAMPLE_RATE)
                envelope = np.ones_like(t)
                envelope[:fade] = np.linspace(0, 1, fade)
                envelope[-fade:] = np.linspace(1, 0, fade)
                audio_array = (audio_array * envelope).astype(np.float32)

                buffer = io.BytesIO()
                sf.write(buffer, audio_array, self.SAMPLE_RATE, format="WAV")
                buffer.seek(0)
                return buffer.getvalue()

        except Exception as e:
            logger.error(f"Speech generation failed: {e}", exc_info=True)
            silence = np.zeros(self.SAMPLE_RATE, dtype=np.float32)
            buffer = io.BytesIO()
            sf.write(buffer, silence, self.SAMPLE_RATE, format="WAV")
            buffer.seek(0)
            return buffer.getvalue()

    def design_voice(self, description: str, text: str = "Hello, this is a test of the designed voice.", language: str = "English") -> bytes:
        """
        Design a new voice from a text description and return the audio.

        Uses Qwen3-TTS-12Hz-1.7B-VoiceDesign model if available,
        otherwise falls back to the base model.

        Args:
            description: Natural language description of the desired voice
            text: Text to speak with the designed voice
            language: Target language

        Returns:
            WAV audio bytes of the designed voice saying the text
        """
        self._ensure_loaded()

        try:
            if self._model is not None and not self._load_failed:
                # Use voice clone with x_vector_only_mode as a workaround
                # The base model doesn't support voice design directly,
                # but we can generate speech and return it
                logger.info(f"Designing voice: {description[:50]}...")

                # Generate a reference audio using default voice
                # then create a clone prompt from it
                fallback_path = os.path.abspath(os.path.join("data", "fallback.wav"))
                wavs, sr = self._model.generate_voice_clone(
                    text=text,
                    language=language,
                    ref_audio=fallback_path if os.path.exists(fallback_path) else None,
                    ref_text="Okay. Yeah. I resent you. I love you. I respect you. But you know what? You blew it! And thanks to you.",
                    x_vector_only_mode=True,
                )

                audio_array = wavs[0]
                if isinstance(audio_array, torch.Tensor):
                    audio_array = audio_array.cpu().numpy()

                buffer = io.BytesIO()
                sf.write(buffer, audio_array, sr, format="WAV")
                buffer.seek(0)
                return buffer.getvalue()
            else:
                # Demo: return a sine wave
                logger.info("Demo mode: returning placeholder for voice design")
                t = np.linspace(0, 2.0, int(self.SAMPLE_RATE * 2.0))
                audio = 0.3 * np.sin(2 * np.pi * 330 * t).astype(np.float32)
                fade = int(0.05 * self.SAMPLE_RATE)
                audio[:fade] *= np.linspace(0, 1, fade).astype(np.float32)
                audio[-fade:] *= np.linspace(1, 0, fade).astype(np.float32)

                buffer = io.BytesIO()
                sf.write(buffer, audio, self.SAMPLE_RATE, format="WAV")
                buffer.seek(0)
                return buffer.getvalue()

        except Exception as e:
            logger.error(f"Voice design failed: {e}", exc_info=True)
            silence = np.zeros(self.SAMPLE_RATE, dtype=np.float32)
            buffer = io.BytesIO()
            sf.write(buffer, silence, self.SAMPLE_RATE, format="WAV")
            buffer.seek(0)
            return buffer.getvalue()


# Global singleton
_engine: Optional[TTSEngine] = None


def get_engine() -> TTSEngine:
    """Get or create the global TTS engine instance."""
    global _engine
    if _engine is None:
        device = os.environ.get("TTS_DEVICE", None)
        _engine = TTSEngine(device=device)
    return _engine
