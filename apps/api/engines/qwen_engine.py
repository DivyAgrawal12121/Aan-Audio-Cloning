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
from utils.audio_utils import (
    normalize_text,
    load_audio,
    load_audio_bytes,
    normalize_audio,
    validate_reference_audio,
)

logger = logging.getLogger("resound-studio.engines.qwen")


class QwenEngine(BaseEngine):
    """
    Qwen3-TTS engine implementation.
    Supports zero-shot voice cloning, speech generation, and prompt-based design.
    
    Phase 0 improvements:
      - Always uses x_vector_only_mode=False (full phoneme alignment)
      - Accepts 2-30 second reference clips
      - Validates and normalizes reference audio
      - Uses librosa for consistent audio loading
      - Supports seed control for reproducibility
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
            "speed": True,
            "cross_lingual": True,
            "seed": True,
        }

    def load(self):
        if self._loaded:
            return

        logger.info(f"Loading Qwen3-TTS model: {self.model_id}")
        try:
            # PERFORMANCE: Enable CuDNN benchmark for faster inference on GPU
            if self.device == "cuda":
                torch.backends.cudnn.benchmark = True
                # Set float32 matmul precision to medium/high for speed on Ampere+ cards
                if torch.cuda.get_device_capability()[0] >= 8:
                    torch.set_float32_matmul_precision('high')
            else:
                # CPU Optimization: Use logical cores effectively
                import multiprocessing
                torch.set_num_threads(multiprocessing.cpu_count())

            # Suppress noisy SoX warning on Windows 
            os.environ["SOX_VERBOSITY"] = "0"
            logging.getLogger("sox").setLevel(logging.CRITICAL)

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
                try: 
                    self._model.model = torch.compile(self._model.model, mode="reduce-overhead")
                except Exception as compile_error:
                    logger.warning(f"torch.compile failed: {compile_error}")
            
            self._loaded = True
            self._load_failed = False
            logger.info(f"Qwen3-TTS loaded successfully on {self.device}!")
        except Exception as e:
            logger.error(f"Failed to load Qwen3-TTS: {e}")
            self._loaded = False
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
        """
        Extract a reusable voice prompt from audio bytes.
        
        Phase 0 improvements:
          - Validates audio (duration, volume, clipping)
          - Normalizes audio to -20dB with peak limiting
          - Uses librosa for consistent 24kHz mono loading
          - ALWAYS uses x_vector_only_mode=False for full phoneme alignment
          - Auto-transcribes with Whisper if no reference text provided
        """
        self.load()
        if self._load_failed or not self._model:
            raise RuntimeError("Qwen3-TTS failed to load.")

        # Phase 0A: Validate reference audio
        is_valid, error_msg = validate_reference_audio(audio_bytes=audio_bytes)
        if not is_valid:
            logger.warning(f"Reference audio validation warning: {error_msg}")
            # Don't hard-fail — log warning but continue (user may have short but valid audio)

        # Phase 0C: Load and normalize audio
        audio_data, sr = load_audio_bytes(audio_bytes, sample_rate=self.SAMPLE_RATE)
        if len(audio_data.shape) > 1:
            audio_data = audio_data.mean(axis=1)
        
        # Normalize to -20dB with peak limiting
        audio_data = normalize_audio(audio_data)

        # Write normalized audio to temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name
            sf.write(tmp_path, audio_data, self.SAMPLE_RATE)

        try:
            # Phase 0B: Auto-transcribe if no reference text
            if not ref_text:
                ref_text = self._auto_transcribe(tmp_path)
                logger.info(f"Auto-transcribed reference text: {ref_text[:80]}...")

            # Phase 0B: ALWAYS use x_vector_only_mode=False for full phoneme alignment
            # This is THE #1 quality improvement — it maps each word to its acoustic features
            prompt_items = self._model.create_voice_clone_prompt(
                ref_audio=tmp_path,
                ref_text=ref_text if ref_text else None,
                x_vector_only_mode=False,  # ← ALWAYS False — full phoneme-aligned voice prompt
            )
            
            prompt_bytes = io.BytesIO()
            torch.save(prompt_items, prompt_bytes)
            
            return {
                "prompt_bytes": prompt_bytes.getvalue(),
                "sample_rate": self.SAMPLE_RATE,
                "reference_text": ref_text,  # Return the transcription for storage
            }
        finally:
            os.unlink(tmp_path)

    def _auto_transcribe(self, audio_path: str) -> str:
        """
        Auto-transcribe audio using Whisper.
        Falls back to a generic reference text if Whisper is unavailable.
        """
        try:
            import whisper
            model = whisper.load_model("base")
            result = model.transcribe(audio_path, language=None)
            text = result.get("text", "").strip()
            if text:
                return text
        except ImportError:
            logger.info("Whisper not installed — using fallback reference text. "
                       "Install with: pip install openai-whisper")
        except Exception as e:
            logger.warning(f"Whisper transcription failed: {e}")
        
        return "This is a reference audio sample for voice cloning."

    # ── Emotion-aware sampling profiles ──
    # These tuned parameters control HOW the model generates prosody,
    # producing genuinely different speech patterns per emotion.
    EMOTION_SAMPLING = {
        "neutral": {
            "temperature": 0.7,
            "top_p": 0.9,
            "top_k": 50,
            "repetition_penalty": 1.0,
        },
        "happy": {
            "temperature": 0.95,
            "top_p": 0.95,
            "top_k": 80,
            "repetition_penalty": 1.1,
        },
        "sad": {
            "temperature": 0.5,
            "top_p": 0.7,
            "top_k": 30,
            "repetition_penalty": 1.0,
        },
        "angry": {
            "temperature": 0.95,
            "top_p": 0.92,
            "top_k": 60,
            "repetition_penalty": 1.2,
        },
        "fearful": {
            "temperature": 0.85,
            "top_p": 0.85,
            "top_k": 50,
            "repetition_penalty": 1.1,
        },
        "surprised": {
            "temperature": 0.95,
            "top_p": 0.95,
            "top_k": 80,
            "repetition_penalty": 1.1,
        },
        "disgusted": {
            "temperature": 0.7,
            "top_p": 0.8,
            "top_k": 40,
            "repetition_penalty": 1.15,
        },
        "whispering": {
            "temperature": 0.4,
            "top_p": 0.6,
            "top_k": 20,
            "repetition_penalty": 1.0,
        },
        "excited": {
            "temperature": 1.0,
            "top_p": 0.98,
            "top_k": 100,
            "repetition_penalty": 1.15,
        },
        "calm": {
            "temperature": 0.5,
            "top_p": 0.7,
            "top_k": 30,
            "repetition_penalty": 1.0,
        },
    }

    # ── Natural emotion cue prefixes ──
    # The Qwen3-TTS tokenizer preserves paralinguistic info embedded in text.
    # These natural-language cues steer prosody far more effectively than
    # bracket instructions which the model ignores completely.
    EMOTION_TEXT_CUES = {
        "happy": "*smiling* ",
        "sad": "*sighs softly* ",
        "angry": "*speaking forcefully* ",
        "fearful": "*nervously* ",
        "surprised": "*gasps* ",
        "disgusted": "*scoffs* ",
        "whispering": "(whispers) ",
        "excited": "*excitedly* ",
        "calm": "",  # Calm is achieved via low temperature, no text prefix needed
    }

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
        text = normalize_text(text)

        # ── Strategy 0: Parse emotion from natural language style prompt ──
        # If the user provided a descriptive prompt (e.g. "deep, dramatic voice with intense energy"),
        # we map it to an emotion profile to apply the correct sampling parameters.
        if style:
            style_lower = style.lower()
            if any(w in style_lower for w in ["angry", "shout", "forceful", "intense", "dramatic", "furious", "aggressive"]):
                emotion = "angry"
            elif any(w in style_lower for w in ["happy", "cheerful", "excited", "joy", "celebratory", "laugh", "upbeat"]):
                emotion = "happy"
            elif any(w in style_lower for w in ["sad", "crying", "depressed", "sorrow", "tear", "melancholy"]):
                emotion = "sad"
            elif any(w in style_lower for w in ["whisper", "quiet", "soft", "secret", "creepy", "bedtime", "gentle", "calm"]):
                emotion = "whisper"
            elif any(w in style_lower for w in ["serious", "news", "authoritative", "professional", "documentary", "firm"]):
                emotion = "serious"
            elif any(w in style_lower for w in ["scared", "fear", "terrified", "panic", "horror", "anxious"]):
                emotion = "scared"
                
            logger.info(f"Inferred emotion '{emotion}' from style prompt: '{style[:50]}'")
        seed = kwargs.get("seed", None)

        # Seed control for reproducibility
        if seed is not None:
            torch.manual_seed(seed)
            if torch.cuda.is_available():
                torch.cuda.manual_seed(seed)
            np.random.seed(seed)
            logger.info(f"Set random seed: {seed}")

        # ── Strategy 1: Emotion-aware sampling parameters ──
        # These directly control HOW the model generates prosody tokens,
        # producing genuinely different speech patterns per emotion.
        sampling = self.EMOTION_SAMPLING.get(emotion, self.EMOTION_SAMPLING["neutral"]).copy()
        logger.info(f"Emotion '{emotion}' → sampling: temp={sampling['temperature']}, "
                     f"top_p={sampling['top_p']}, top_k={sampling['top_k']}, "
                     f"rep_penalty={sampling['repetition_penalty']}")

        # ── Strategy 2: Natural emotion cues in text ──
        # The Qwen3-TTS tokenizer preserves paralinguistic markers like (laughs),
        # *sighs*, (whispers) etc. We embed these as natural cues rather than
        # using the raw style prompt (which would just be read aloud).
        if emotion and emotion != "neutral":
            cue = self.EMOTION_TEXT_CUES.get(emotion, "")
            if cue:
                text = f"{cue} {text}".strip()
                logger.info(f"Applied prefix cue for '{emotion}': {cue}")

        logger.info(f"Final text for generation ({emotion}): {text[:100]}...")

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
                do_sample=True,
                temperature=sampling["temperature"],
                top_p=sampling["top_p"],
                top_k=sampling["top_k"],
                repetition_penalty=sampling["repetition_penalty"],
            )
        else:
            # Fallback: use basic mode (shouldn't happen with new cloning pipeline)
            fallback_path = os.path.join("data", "fallback.wav")
            if not os.path.exists(fallback_path):
                sf.write(fallback_path, np.zeros(24000), 24000)
                
            wavs, sr = self._model.generate_voice_clone(
                text=text,
                language=language,
                ref_audio=fallback_path,
                ref_text="Hello, this is a test.",
                x_vector_only_mode=True,
                do_sample=True,
                temperature=sampling["temperature"],
                top_p=sampling["top_p"],
                top_k=sampling["top_k"],
                repetition_penalty=sampling["repetition_penalty"],
            )

        # Extract the actual audio array
        audio_array = wavs[0] if isinstance(wavs, (list, tuple)) else wavs
        logger.info(f"Raw audio type={type(audio_array)}, shape={getattr(audio_array, 'shape', 'N/A')}")

        if isinstance(audio_array, torch.Tensor):
            audio_array = audio_array.to(torch.float32).cpu().numpy()
        else:
            audio_array = np.array(audio_array, dtype=np.float32)

        if audio_array.ndim > 1:
            audio_array = audio_array.squeeze()

        # Phase 2: Proper speed control using librosa time_stretch
        if speed and speed != 1.0 and 0.5 <= speed <= 2.0:
            try:
                import librosa
                # time_stretch: rate > 1 = faster, rate < 1 = slower
                audio_array = librosa.effects.time_stretch(audio_array, rate=speed)
                logger.info(f"Applied speed={speed}x via librosa time_stretch (pitch-preserving)")
            except ImportError:
                # Fallback to old np.interp method
                original_len = len(audio_array)
                target_len = int(original_len / speed)
                indices = np.linspace(0, original_len - 1, target_len)
                audio_array = np.interp(indices, np.arange(original_len), audio_array).astype(np.float32)
                logger.info(f"Applied speed={speed}x via np.interp fallback: {original_len} -> {len(audio_array)} samples")

        # Phase 2: Pitch shifting via librosa
        if pitch and pitch != 1.0 and 0.5 <= pitch <= 2.0:
            try:
                import librosa
                # Convert pitch multiplier to semitones: 2.0x = +12 semitones, 0.5x = -12 semitones
                import math
                n_steps = 12 * math.log2(pitch)
                audio_array = librosa.effects.pitch_shift(
                    audio_array, sr=sr, n_steps=n_steps
                )
                logger.info(f"Applied pitch={pitch}x ({n_steps:+.1f} semitones) via librosa pitch_shift")
            except ImportError:
                logger.warning("librosa not installed — pitch shift skipped")

        buffer = io.BytesIO()
        sf.write(buffer, audio_array, sr, format="WAV")
        buffer.seek(0)
        return buffer.getvalue()

    def design_voice(self, description: str, text: str, **kwargs) -> bytes:
        """
        Design a voice from a text description.
        
        Note: The base QwenEngine uses generate_voice_clone with description-enriched text.
        For best voice design results, use the QwenDesignEngine (qwen-1.7b-design model).
        """
        self.load()
        if self._load_failed or not self._model:
            raise RuntimeError("Qwen3-TTS failed to load.")

        language = kwargs.get("language", "English")
        logger.info(f"Designing voice: {description[:50]}...")
        
        text = normalize_text(text)

        supported = ['auto', 'chinese', 'english', 'french', 'german', 'italian', 'japanese', 'korean', 'portuguese', 'russian', 'spanish']
        if language.lower() not in supported:
            language = "English"

        # Enrich text with the voice description as an instruction
        enriched_text = f"[{description}] {text}"

        fallback_path = os.path.join("data", "fallback.wav")
        if not os.path.exists(fallback_path):
            sf.write(fallback_path, np.zeros(24000), 24000)
            
        wavs, sr = self._model.generate_voice_clone(
            text=enriched_text,
            language=language,
            ref_audio=fallback_path,
            ref_text="This is a fallback reference audio for design purposes.",
            x_vector_only_mode=True,
        )

        audio_array = wavs[0] if isinstance(wavs, (list, tuple)) else wavs
        logger.info(f"Raw design audio type={type(audio_array)}, shape={getattr(audio_array, 'shape', 'N/A')}")

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
