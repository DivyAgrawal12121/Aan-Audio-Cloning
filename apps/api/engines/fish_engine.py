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

logger = logging.getLogger("resound-studio.engines.fish")


class FishSpeechEngine(BaseEngine):
    """
    Fish Speech v1.4 engine - LLM-based audio token prediction.
    Great for anime voices, character acting, and multi-speaker podcast generation.
    """

    SAMPLE_RATE = 44100

    def __init__(self, device: Optional[str] = None, model_id: Optional[str] = None):
        super().__init__(
            device=device or ("cuda" if torch.cuda.is_available() else "cpu"),
            model_id=model_id or "fishaudio/fish-speech-1.4",
        )

    def get_capabilities(self) -> Dict[str, bool]:
        return {"clone": True, "design": False, "foley": False, "emotion": True, "speed": True}

    def load(self):
        if self._loaded:
            return
        logger.info(f"Loading Fish Speech: {self.model_id}")
        try:
            from fish_speech.inference import TTSInference

            self._model = TTSInference(model=self.model_id, device=self.device)
            self._loaded = True
            logger.info("Fish Speech loaded successfully!")
        except Exception as e:
            logger.error(f"Failed to load Fish Speech: {e}", exc_info=True)
            self._loaded = False
            self._model = None

    def unload(self):
        logger.info("Unloading Fish Speech...")
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
            raise RuntimeError("Fish Speech failed to load.")

        # Store reference text and engine marker in the embedding.
        # The actual audio is saved as sample.wav by voice_store.save_voice(),
        # so we DON'T store a temp file path (it would get deleted by the OS).
        prompt_bytes = io.BytesIO()
        torch.save({"ref_text": ref_text, "engine": "fish"}, prompt_bytes)
        return {
            "prompt_bytes": prompt_bytes.getvalue(),
            "sample_rate": self.SAMPLE_RATE,
        }

    def generate_speech(self, text: str, embedding_path: str, **kwargs) -> bytes:
        self.load()
        if self._model is None:
            raise RuntimeError("Fish Speech failed to load.")
            
        text = normalize_text(text)

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
            raise RuntimeError(f"Reference audio not found for Fish Speech voice. Expected: {ref_audio}")

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out_tmp:
            out_path = out_tmp.name

        try:
            self._model.tts(
                text=text,
                ref_audio=ref_audio,
                ref_text=ref_text,
                output_path=out_path,
            )
            with open(out_path, "rb") as f:
                return f.read()
        finally:
            if os.path.exists(out_path):
                os.unlink(out_path)

    def generate_podcast(self, script: str, voice_a_path: str, voice_b_path: str, **kwargs) -> bytes:
        """Generate multi-speaker podcast using Fish Speech."""
        self.load()
        if self._model is None:
            raise RuntimeError("Fish Speech failed to load.")

        lines = script.strip().split("\n")
        all_audio = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

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

            prompt_data = None
            try:
                prompt_data = torch.load(ref_path, map_location="cpu", weights_only=False)
            except Exception:
                pass

            ref_text_prompt = ""
            if isinstance(prompt_data, dict):
                ref_text_prompt = prompt_data.get("ref_text", "")

            ref_audio = ref_path.replace("embedding.pt", "sample.wav")
            if not os.path.exists(ref_audio) and isinstance(prompt_data, dict):
                ref_audio = prompt_data.get("ref_audio_path", "")

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out_tmp:
                out_path = out_tmp.name

            self._model.tts(text=text, ref_audio=ref_audio, ref_text=ref_text_prompt, output_path=out_path)

            audio_data, sr = sf.read(out_path)
            all_audio.append(audio_data)
            os.unlink(out_path)

            pause = np.zeros(int(self.SAMPLE_RATE * 0.5))
            all_audio.append(pause)

        combined = np.concatenate(all_audio)
        buffer = io.BytesIO()
        sf.write(buffer, combined, self.SAMPLE_RATE, format="WAV")
        buffer.seek(0)
        return buffer.getvalue()
