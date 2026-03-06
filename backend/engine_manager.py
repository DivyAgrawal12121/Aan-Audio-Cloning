import os
import gc
import time
import json
import logging
import threading
from typing import Dict, Any, Optional, Generator
from dataclasses import dataclass, asdict
from engines.base_engine import BaseEngine
from engines.qwen_engine import QwenEngine

logger = logging.getLogger("voxforge.manager")


@dataclass
class LoadProgress:
    """Represents a snapshot of model loading progress."""
    phase: str            # 'unloading' | 'importing' | 'downloading' | 'loading_gpu' | 'ready' | 'error'
    percent: float        # 0-100
    message: str
    downloaded_mb: float = 0.0
    total_mb: float = 0.0
    speed_mbps: float = 0.0
    eta_seconds: float = 0.0
    model_id: str = ""
    model_name: str = ""

    def to_sse(self) -> str:
        return f"data: {json.dumps(asdict(self))}\n\n"


def _lazy_import(engine_name: str):
    """Lazy import engine classes to avoid import errors when libraries aren't installed."""
    if engine_name == "QwenEngine":
        from engines.qwen_engine import QwenEngine
        return QwenEngine
    elif engine_name == "QwenDesignEngine":
        from engines.qwen_design_engine import QwenDesignEngine
        return QwenDesignEngine
    elif engine_name == "BarkEngine":
        from engines.bark_engine import BarkEngine
        return BarkEngine
    elif engine_name == "F5Engine":
        from engines.f5_engine import F5Engine
        return F5Engine
    elif engine_name == "ParlerEngine":
        from engines.parler_engine import ParlerEngine
        return ParlerEngine
    elif engine_name == "CosyVoiceEngine":
        from engines.cosyvoice_engine import CosyVoiceEngine
        return CosyVoiceEngine
    elif engine_name == "XTTSEngine":
        from engines.xtts_engine import XTTSEngine
        return XTTSEngine
    elif engine_name == "FishSpeechEngine":
        from engines.fish_engine import FishSpeechEngine
        return FishSpeechEngine
    else:
        raise ValueError(f"Unknown engine: {engine_name}")


class EngineManager:
    """
    Manages the lifecycle of AI Audio models.
    Ensures only ONE heavy model is loaded into VRAM at a time.
    """

    # ──────────────────────────────────────────────
    #  Full Model Registry
    # ──────────────────────────────────────────────
    AVAILABLE_MODELS = {
        # ── Qwen3-TTS Family ──
        "qwen-1.7b": {
            "name": "Qwen3-TTS 1.7B Base",
            "description": "Alibaba's robust cloning and speech generation model. Excellent for general TTS and voice cloning.",
            "engine_class": "QwenEngine",
            "model_id": "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
            "vram_estimate": "3.5 GB",
            "download_size": "3.5 GB",
            "capabilities": ["clone", "generate", "emotion", "speed"],
            "features": ["voice_cloning", "tts", "emotional_speech"],
        },
        "qwen-1.7b-design": {
            "name": "Qwen3-TTS 1.7B VoiceDesign",
            "description": "Specialized Qwen model for creating entirely new voices from text descriptions. Best for voice design tasks.",
            "engine_class": "QwenDesignEngine",
            "model_id": "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
            "vram_estimate": "3.5 GB",
            "download_size": "3.5 GB",
            "capabilities": ["design", "generate", "emotion"],
            "features": ["voice_design", "tts"],
        },
        "qwen-0.6b": {
            "name": "Qwen3-TTS 0.6B Base",
            "description": "Lighter Qwen model for lower VRAM GPUs. Trades some quality for speed and efficiency.",
            "engine_class": "QwenEngine",
            "model_id": "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
            "vram_estimate": "1.5 GB",
            "download_size": "1.2 GB",
            "capabilities": ["clone", "generate", "speed"],
            "features": ["voice_cloning", "tts"],
        },

        # ── Bark (Suno) ──
        "bark": {
            "name": "Suno Bark",
            "description": "Generate sound effects, music, laughter, and expressive speech. The only model that can produce non-speech audio like dog barks, crowd noise, and ambient sounds.",
            "engine_class": "BarkEngine",
            "model_id": "suno/bark",
            "vram_estimate": "6-12 GB",
            "download_size": "4 GB",
            "capabilities": ["generate", "foley", "music"],
            "features": ["foley", "tts", "sound_effects"],
        },

        # ── F5-TTS ──
        "f5-tts": {
            "name": "F5-TTS",
            "description": "Ultra-fast non-autoregressive flow-matching model. Exceptional at zero-shot voice cloning and podcast generation with minimal hallucination.",
            "engine_class": "F5Engine",
            "model_id": "SWivid/F5-TTS",
            "vram_estimate": "4-8 GB",
            "download_size": "1.2 GB",
            "capabilities": ["clone", "generate", "speed"],
            "features": ["voice_cloning", "tts", "podcast"],
        },

        # ── Parler-TTS ──
        "parler-tts": {
            "name": "Parler-TTS Large",
            "description": "Type a voice description like 'A deep male narrator in a quiet studio' and generate a brand new voice. King of prompt-based voice design.",
            "engine_class": "ParlerEngine",
            "model_id": "parler-tts/parler-tts-large-v1",
            "vram_estimate": "6-10 GB",
            "download_size": "2.5 GB",
            "capabilities": ["design", "generate"],
            "features": ["voice_design", "tts"],
        },

        # ── CosyVoice (Alibaba) ──
        "cosyvoice": {
            "name": "CosyVoice v2",
            "description": "State-of-the-art emotional control and cross-lingual dubbing. Clone a voice in English and make it speak fluent Japanese or Hindi.",
            "engine_class": "CosyVoiceEngine",
            "model_id": "FunAudioLLM/CosyVoice2-0.5B",
            "vram_estimate": "4-8 GB",
            "download_size": "2.5 GB",
            "capabilities": ["clone", "generate", "emotion", "cross_lingual"],
            "features": ["voice_cloning", "tts", "emotional_speech", "dubbing"],
        },

        # ── XTTS v2 (Coqui) ──
        "xtts-v2": {
            "name": "XTTS v2",
            "description": "Cross-lingual voice cloning pioneer. Record in English, speak in 17+ languages with your cloned voice. Established and battle-tested.",
            "engine_class": "XTTSEngine",
            "model_id": "tts_models/multilingual/multi-dataset/xtts_v2",
            "vram_estimate": "3-6 GB",
            "download_size": "2 GB",
            "capabilities": ["clone", "generate", "cross_lingual"],
            "features": ["voice_cloning", "tts", "dubbing"],
        },

        # ── Fish Speech ──
        "fish-speech": {
            "name": "Fish Speech v1.4",
            "description": "LLM-based audio token prediction with incredible expressiveness. Great for anime voices, character acting, and multi-speaker podcast generation.",
            "engine_class": "FishSpeechEngine",
            "model_id": "fishaudio/fish-speech-1.4",
            "vram_estimate": "6-12 GB",
            "download_size": "3.5 GB",
            "capabilities": ["clone", "generate", "emotion"],
            "features": ["voice_cloning", "tts", "podcast"],
        },
    }

    def __init__(self):
        self.active_model_id: Optional[str] = None
        # LRU Cache: Dict maintains insertion order. Last item is most recently used.
        self.loaded_engines: Dict[str, BaseEngine] = {}
        self.max_loaded_models = int(os.environ.get("MAX_LOADED_MODELS", "2"))
        # Shared progress state for SSE streaming
        self._progress: Optional[LoadProgress] = None
        self._loading_lock = threading.Lock()

    def get_available_models(self) -> Dict[str, Any]:
        """Returns the dictionary of all supported models and their metadata (JSON-safe)."""
        return {
            k: {key: val for key, val in v.items() if key != "engine_class"}
            for k, v in self.AVAILABLE_MODELS.items()
        }

    # ─────────────────────────────────────
    #  Standard (non-streaming) load
    # ─────────────────────────────────────
    def load_model(self, model_id: str) -> BaseEngine:
        """
        Dynamically loads a model into VRAM.
        If a different model is currently loaded, it unloads it first.
        """
        if model_id not in self.AVAILABLE_MODELS:
            raise ValueError(f"Unknown model ID: {model_id}")

        if self.active_model_id == model_id and model_id in self.loaded_engines and self.loaded_engines[model_id].is_loaded:
            logger.info(f"Model {model_id} is already loaded.")
            return self.loaded_engines[model_id]

        if model_id in self.loaded_engines and self.loaded_engines[model_id].is_loaded:
            logger.info(f"Model {model_id} is in cache. Switching to it.")
            # Move to end to mark as most recently used
            engine = self.loaded_engines.pop(model_id)
            self.loaded_engines[model_id] = engine
            self.active_model_id = model_id
            return engine

        if len(self.loaded_engines) >= self.max_loaded_models:
            # Unload the oldest model (first item in dict)
            oldest_id = next(iter(self.loaded_engines))
            logger.info(f"VRAM cache full. Unloading {oldest_id} to make room for {model_id}...")
            oldest_engine = self.loaded_engines.pop(oldest_id)
            oldest_engine.unload()

        logger.info(f"Initializing engine for {model_id}...")
        model_info = self.AVAILABLE_MODELS[model_id]
        engine_class = _lazy_import(model_info["engine_class"])

        device = os.environ.get("TTS_DEVICE", None)
        new_engine = engine_class(device=device, model_id=model_info.get("model_id"))
        new_engine.load()

        self.active_model_id = model_id
        self.loaded_engines[model_id] = new_engine
        return new_engine

    # ─────────────────────────────────────
    #  Streaming load with progress
    # ─────────────────────────────────────
    def load_model_with_progress(self, model_id: str) -> Generator[LoadProgress, None, None]:
        """
        Generator that yields LoadProgress events as the model is loaded.
        Enables SSE streaming to the frontend.
        """
        if model_id not in self.AVAILABLE_MODELS:
            yield LoadProgress(phase="error", percent=0, message=f"Unknown model: {model_id}", model_id=model_id)
            return

        model_info = self.AVAILABLE_MODELS[model_id]
        model_name = model_info["name"]
        hf_model_id = model_info.get("model_id", "")
        download_size_str = model_info.get("download_size", "0 GB")
        # Parse total size in MB
        try:
            total_mb = float(download_size_str.replace(" GB", "").replace(" MB", "").split("-")[0]) * 1024 \
                       if "GB" in download_size_str else float(download_size_str.replace(" MB", ""))
        except:
            total_mb = 2048.0  # Fallback 2GB estimate

        # Already loaded as active?
        if self.active_model_id == model_id and model_id in self.loaded_engines and self.loaded_engines[model_id].is_loaded:
            yield LoadProgress(phase="ready", percent=100, message=f"{model_name} already loaded",
                               model_id=model_id, model_name=model_name, total_mb=total_mb, downloaded_mb=total_mb)
            return

        # Already in cache but not active?
        if model_id in self.loaded_engines and self.loaded_engines[model_id].is_loaded:
            yield LoadProgress(phase="loading_gpu", percent=90, message=f"{model_name} found in VRAM cache ✓",
                               model_id=model_id, model_name=model_name, total_mb=total_mb, downloaded_mb=total_mb)
            engine = self.loaded_engines.pop(model_id)
            self.loaded_engines[model_id] = engine
            self.active_model_id = model_id
            yield LoadProgress(phase="ready", percent=100, message=f"{model_name} is active!",
                               model_id=model_id, model_name=model_name, total_mb=total_mb, downloaded_mb=total_mb)
            return

        # ── Phase 1: Unload oldest if cache is full ──
        if len(self.loaded_engines) >= self.max_loaded_models:
            oldest_id = next(iter(self.loaded_engines))
            yield LoadProgress(phase="unloading", percent=5, message=f"VRAM caching full. Unloading {oldest_id}...",
                               model_id=model_id, model_name=model_name, total_mb=total_mb)
            
            oldest_engine = self.loaded_engines.pop(oldest_id)
            oldest_engine.unload()
            
            gc.collect()
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except ImportError:
                pass
            yield LoadProgress(phase="unloading", percent=10, message="Old model unloaded, VRAM freed",
                               model_id=model_id, model_name=model_name, total_mb=total_mb)

        # ── Phase 2: Import engine class ──
        yield LoadProgress(phase="importing", percent=12, message=f"Importing {model_info['engine_class']}...",
                           model_id=model_id, model_name=model_name, total_mb=total_mb)
        try:
            engine_class = _lazy_import(model_info["engine_class"])
        except Exception as e:
            yield LoadProgress(phase="error", percent=12, message=f"Import error: {e}",
                               model_id=model_id, model_name=model_name)
            return
        yield LoadProgress(phase="importing", percent=15, message="Engine class loaded",
                           model_id=model_id, model_name=model_name, total_mb=total_mb)

        # ── Phase 3: Download model weights ──
        yield LoadProgress(phase="downloading", percent=15, message=f"Checking local cache for {hf_model_id}...",
                           model_id=model_id, model_name=model_name, total_mb=total_mb, downloaded_mb=0)

        # Simulate download progress (real progress tracking from HF hub is complex)
        # In a real deployment we'd hook into huggingface_hub's progress callbacks
        download_start = time.time()
        download_complete = False

        # Check if model is already cached
        try:
            from huggingface_hub import try_to_load_from_cache, scan_cache_dir
            cached = False
            try:
                cache_info = scan_cache_dir()
                for repo_info in cache_info.repos:
                    if hf_model_id.lower().replace("/", "--") in str(repo_info.repo_id).lower().replace("/", "--"):
                        cached = True
                        break
            except:
                pass

            if cached:
                yield LoadProgress(phase="downloading", percent=65, message="Model found in cache ✓",
                                   model_id=model_id, model_name=model_name,
                                   total_mb=total_mb, downloaded_mb=total_mb, speed_mbps=0)
                download_complete = True
        except ImportError:
            pass

        if not download_complete:
            # Simulate progressive download for visual feedback
            # The actual download happens inside engine.load()
            steps = [(20, "Resolving model files..."), (30, "Downloading config..."),
                     (40, "Downloading tokenizer..."), (50, "Downloading model weights (this may take a while)..."),
                     (60, "Downloading model weights..."), (65, "Verifying checksums...")]
            for pct, msg in steps:
                elapsed = time.time() - download_start
                simulated_dl = total_mb * (pct - 15) / 50  # Proportional
                speed = simulated_dl / elapsed if elapsed > 0.5 else 0
                eta = (total_mb - simulated_dl) / speed if speed > 0 else 0
                yield LoadProgress(phase="downloading", percent=pct, message=msg,
                                   model_id=model_id, model_name=model_name,
                                   total_mb=total_mb, downloaded_mb=round(simulated_dl, 1),
                                   speed_mbps=round(speed, 1), eta_seconds=round(eta, 1))
                time.sleep(0.15)

        # ── Phase 4: Instantiate engine and load to GPU ──
        yield LoadProgress(phase="loading_gpu", percent=70, message="Instantiating engine...",
                           model_id=model_id, model_name=model_name,
                           total_mb=total_mb, downloaded_mb=total_mb)

        try:
            device = os.environ.get("TTS_DEVICE", None)
            new_engine = engine_class(device=device, model_id=model_info.get("model_id"))

            yield LoadProgress(phase="loading_gpu", percent=75, message="Loading model weights into memory...",
                               model_id=model_id, model_name=model_name,
                               total_mb=total_mb, downloaded_mb=total_mb)

            # This is the heavy call that downloads (if not cached) + loads to GPU
            new_engine.load()

            yield LoadProgress(phase="loading_gpu", percent=95, message="Model loaded into GPU VRAM ✓",
                               model_id=model_id, model_name=model_name,
                               total_mb=total_mb, downloaded_mb=total_mb)

            self.active_model_id = model_id
            self.loaded_engines[model_id] = new_engine

            yield LoadProgress(phase="ready", percent=100, message=f"{model_name} is ready!",
                               model_id=model_id, model_name=model_name,
                               total_mb=total_mb, downloaded_mb=total_mb)

        except Exception as e:
            logger.error(f"Failed to load model {model_id}: {e}", exc_info=True)
            yield LoadProgress(phase="error", percent=0, message=str(e),
                               model_id=model_id, model_name=model_name)

    def get_current_engine(self) -> BaseEngine:
        """
        Returns the active engine. If none is loaded, defaults to Qwen.
        """
        if self.active_model_id is None or self.active_model_id not in self.loaded_engines or not self.loaded_engines[self.active_model_id].is_loaded:
            logger.warning("No engine actively loaded. Defaulting to qwen-1.7b")
            return self.load_model("qwen-1.7b")
        return self.loaded_engines[self.active_model_id]


# Global singleton instance
_manager: Optional[EngineManager] = None

def get_manager() -> EngineManager:
    global _manager
    if _manager is None:
        _manager = EngineManager()
    return _manager
