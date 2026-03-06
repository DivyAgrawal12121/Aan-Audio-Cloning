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

logger = logging.getLogger("resound-studio.engines.f5")


class F5Engine(BaseEngine):
    """
    F5-TTS engine - ultra-fast non-autoregressive flow-matching model.
    Excels at zero-shot voice cloning and podcast generation.
    """

    SAMPLE_RATE = 24000

    def __init__(self, device: Optional[str] = None, model_id: Optional[str] = None):
        super().__init__(
            device=device or ("cuda" if torch.cuda.is_available() else "cpu"),
            model_id=model_id or "SWivid/F5-TTS",
        )

    def get_capabilities(self) -> Dict[str, bool]:
        return {"clone": True, "design": False, "foley": False, "emotion": False, "speed": True}

    def load(self):
        if self._loaded:
            return
        
        device_status = "Available" if torch.cuda.is_available() else "NOT Available"
        logger.info(f"Loading F5-TTS model: {self.model_id}. Device: {self.device}. CUDA {device_status}")
        
        try:
            from f5_tts.api import F5TTS

            # Explicitly check if model init fails on this device
            self._model = F5TTS(model_type="F5-TTS", device=self.device)
            
            if os.environ.get("TTS_COMPILE", "0") == "1":
                logger.info("Compiling F5-TTS model graph for optimized inference...")
                try:
                    self._model.model = torch.compile(self._model.model, mode="reduce-overhead")
                except Exception as ce:
                    logger.warning(f"F5-TTS compilation failed: {ce}")
                
            self._loaded = True
            logger.info("F5-TTS loaded successfully!")
        except Exception as e:
            logger.error(f"CRITICAL: Failed to load F5-TTS on {self.device}: {e}", exc_info=True)
            # Try fallback to CPU if CUDA failed
            if self.device == "cuda":
                logger.info("Retrying F5-TTS loading on CPU...")
                try:
                    self.device = "cpu"
                    from f5_tts.api import F5TTS
                    self._model = F5TTS(model_type="F5-TTS", device="cpu")
                    self._loaded = True
                    logger.info("F5-TTS loaded successfully on CPU fallback.")
                except Exception as e2:
                    logger.error(f"F5-TTS fallback to CPU also failed: {e2}")
                    self._model = None
                    self._loaded = True
            else:
                self._loaded = True
                self._model = None

    def unload(self):
        logger.info("Unloading F5-TTS...")
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
            raise RuntimeError("F5-TTS failed to load.")

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name
            audio_data, sr = sf.read(io.BytesIO(audio_bytes))
            if len(audio_data.shape) > 1:
                audio_data = audio_data.mean(axis=1)
            sf.write(tmp_path, audio_data, sr)

        try:
            # F5-TTS uses ref audio path directly for cloning
            prompt_bytes = io.BytesIO()
            torch.save({"ref_audio_path": tmp_path, "ref_text": ref_text, "engine": "f5"}, prompt_bytes)
            return {
                "prompt_bytes": prompt_bytes.getvalue(),
                "sample_rate": self.SAMPLE_RATE,
            }
        except Exception as e:
            logger.error(f"F5-TTS clone failed: {e}", exc_info=True)
            raise

    def generate_speech(self, text: str, embedding_path: str, **kwargs) -> bytes:
        self.load()
        if self._model is None:
            raise RuntimeError("F5-TTS failed to load.")

        prompt_data = torch.load(embedding_path, map_location="cpu", weights_only=False)
        ref_audio = prompt_data.get("ref_audio_path", "")
        ref_text = prompt_data.get("ref_text", "")

        text = normalize_text(text)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out_tmp:
            out_path = out_tmp.name

        try:
            # F5 supports speed control. Pass optional parameters if available.
            speed = kwargs.get("speed", 1.0)
            
            self._model.infer(
                ref_file=ref_audio,
                ref_text=ref_text,
                gen_text=text,
                file_wave=out_path,
                speed=speed,
            )

            with open(out_path, "rb") as f:
                return f.read()
        finally:
            if os.path.exists(out_path):
                os.unlink(out_path)

    def generate_podcast(self, script: str, voice_a_path: str, voice_b_path: str, **kwargs) -> bytes:
        """Generate multi-speaker podcast using F5-TTS's fast generation."""
        self.load()
        if self._model is None:
            raise RuntimeError("F5-TTS failed to load.")

        # Parse script into speaker turns
        lines = script.strip().split("\n")
        all_audio = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Determine speaker (A: or B: prefix)
            if line.upper().startswith("A:"):
                ref_path = voice_a_path
                text = line[2:].strip()
            elif line.upper().startswith("B:"):
                ref_path = voice_b_path
                text = line[2:].strip()
            else:
                ref_path = voice_a_path
                text = line

            text = normalize_text(text)

            prompt_data = torch.load(ref_path, map_location="cpu", weights_only=False)
            ref_audio = prompt_data.get("ref_audio_path", "")
            ref_text = prompt_data.get("ref_text", "")

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out_tmp:
                out_path = out_tmp.name

            # Keep podcast generation at regular speed by default.
            self._model.infer(ref_file=ref_audio, ref_text=ref_text, gen_text=text, file_wave=out_path, speed=1.0)

            audio_data, sr = sf.read(out_path)
            # Ensure float32 for consistency
            audio_data = audio_data.astype(np.float32)
            all_audio.append(audio_data)
            os.unlink(out_path)

            # Add a small pause between turns
            pause = np.zeros(int(self.SAMPLE_RATE * 0.5), dtype=np.float32)
            all_audio.append(pause)

        combined = np.concatenate(all_audio)
        
        # Audio Post-processing
        combined = np.nan_to_num(combined)
        if np.abs(combined).max() > 0:
            combined = combined / np.abs(combined).max() * 0.95

        buffer = io.BytesIO()
        sf.write(buffer, combined, self.SAMPLE_RATE, format="WAV")
        buffer.seek(0)
        return buffer.getvalue()
