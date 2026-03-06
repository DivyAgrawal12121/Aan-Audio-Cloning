from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

class BaseEngine(ABC):
    """
    Abstract base class for all TTS engines (Qwen, Bark, F5, etc.)
    Ensures a unified API for the FastAPI backend regardless of the underlying model.
    """

    def __init__(self, device: Optional[str] = None, model_id: Optional[str] = None):
        self.device = device
        self.model_id = model_id
        self._loaded = False
        self._model = None

    @abstractmethod
    def load(self):
        """
        Allocate model weights into GPU VRAM. 
        Must gracefully handle downloading if weights are missing locally.
        """
        pass

    @abstractmethod
    def unload(self):
        """
        Deallocate the model from memory.
        Must delete the internal model reference and call gc.collect() / torch.cuda.empty_cache().
        """
        pass

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @abstractmethod
    def get_capabilities(self) -> Dict[str, bool]:
        """
        Return a dictionary of what this model can do.
        e.g., {"clone": True, "design": False, "foley": False}
        """
        pass

    # --- Core Generation APIs ---
    # Implementations should raise NotImplementedError if they don't support a feature

    def generate_speech(self, text: str, embedding_path: str, **kwargs) -> bytes:
        """Generate audio bytes from text using a pre-computed voice embedding."""
        raise NotImplementedError(f"{self.__class__.__name__} does not support generation via embeddings.")

    def clone_voice(self, audio_bytes: bytes, ref_text: str = "") -> dict:
        """Extract a reusable voice prompt dictionary from audio bytes."""
        raise NotImplementedError(f"{self.__class__.__name__} does not support zero-shot voice cloning.")

    def design_voice(self, description: str, text: str, **kwargs) -> bytes:
        """Synthesize a novel voice purely from a text description."""
        raise NotImplementedError(f"{self.__class__.__name__} does not support prompt-based voice design.")

    def generate_foley(self, description: str, **kwargs) -> bytes:
        """Generate sound effects / foley audio from a text description."""
        raise NotImplementedError(f"{self.__class__.__name__} does not support foley/sound-effect generation.")

    def cross_lingual_clone(self, audio_bytes: bytes, text: str, source_lang: str, target_lang: str, **kwargs) -> bytes:
        """Clone a voice from one language and generate speech in another language."""
        raise NotImplementedError(f"{self.__class__.__name__} does not support cross-lingual dubbing.")

    def generate_podcast(self, script: str, voice_a_path: str, voice_b_path: str, **kwargs) -> bytes:
        """Generate a multi-speaker podcast from a script using two voice embeddings."""
        raise NotImplementedError(f"{self.__class__.__name__} does not support podcast generation.")

    def audio_inpaint(self, audio_bytes: bytes, original_text: str, corrected_text: str, **kwargs) -> bytes:
        """Replace a segment of audio corresponding to original_text with corrected_text."""
        raise NotImplementedError(f"{self.__class__.__name__} does not support audio in-painting.")
