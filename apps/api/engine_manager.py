import os
import gc
import time
import json
import asyncio
import logging
import threading
from typing import Dict, Any, Optional, Generator
from dataclasses import dataclass, asdict
from engines.base_engine import BaseEngine
from engines.qwen_engine import QwenEngine
from utils.hf_progress import HFProgressTracker
from utils.progress import ProgressManager, get_progress_manager, create_hf_progress_callback

logger = logging.getLogger("resound-studio.manager")


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
    else:
        raise ValueError(f"Unknown engine: {engine_name}")


def detect_accelerators() -> Dict[str, Any]:
    """
    Detect all available hardware accelerators.
    Returns info about CUDA, MPS, DirectML, XPU, and MLX.
    """
    result = {
        "cuda": {"available": False, "device_count": 0, "devices": []},
        "mps": {"available": False},
        "directml": {"available": False},
        "xpu": {"available": False},
        "mlx": {"available": False},
        "cpu": {"available": True},
        "recommended": "cpu",
    }

    try:
        import torch
        
        # CUDA (NVIDIA GPUs)
        if torch.cuda.is_available():
            result["cuda"]["available"] = True
            result["cuda"]["device_count"] = torch.cuda.device_count()
            for i in range(torch.cuda.device_count()):
                try:
                    props = torch.cuda.get_device_properties(i)
                    result["cuda"]["devices"].append({
                        "index": i,
                        "name": props.name,
                        "total_memory_gb": round(props.total_memory / 1e9, 2),
                        "compute_capability": f"{props.major}.{props.minor}",
                    })
                except Exception:
                    result["cuda"]["devices"].append({"index": i, "name": "unknown"})
            result["recommended"] = "cuda"

        # MPS (Apple Silicon Metal)
        if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            result["mps"]["available"] = True
            if not result["cuda"]["available"]:
                result["recommended"] = "mps"

        # Intel XPU (via intel_extension_for_pytorch)
        try:
            import intel_extension_for_pytorch as ipex
            if hasattr(torch, 'xpu') and torch.xpu.is_available():
                result["xpu"]["available"] = True
                result["xpu"]["device_count"] = torch.xpu.device_count()
                if not result["cuda"]["available"] and not result["mps"]["available"]:
                    result["recommended"] = "xpu"
        except ImportError:
            pass

        # DirectML (AMD/Intel GPUs on Windows via torch-directml)
        try:
            import torch_directml
            result["directml"]["available"] = True
            result["directml"]["device_count"] = torch_directml.device_count()
            if result["recommended"] == "cpu":
                result["recommended"] = "directml"
        except ImportError:
            pass

    except ImportError:
        pass

    # MLX (Apple Silicon native — separate from PyTorch)
    try:
        import mlx.core as mx
        result["mlx"]["available"] = True
        if result["recommended"] == "cpu":
            result["recommended"] = "mlx"
    except ImportError:
        pass

    return result


class EngineManager:
    """
    Manages the lifecycle of AI Audio models.
    Ensures only ONE heavy model is loaded into VRAM at a time.
    
    Improvements:
      - Real download progress tracking (replaces fake time.sleep simulation)
      - Multi-accelerator detection (CUDA, MPS, DirectML, XPU, MLX)
      - Voice prompt cache integration
      - Async-aware loading
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
    }

    def __init__(self):
        self.active_model_id: Optional[str] = None
        # LRU Cache: Dict maintains insertion order. Last item is most recently used.
        self.loaded_engines: Dict[str, BaseEngine] = {}
        self.max_loaded_models = int(os.environ.get("MAX_LOADED_MODELS", "2"))
        # Shared progress state for SSE streaming
        self._progress: Optional[LoadProgress] = None
        self._loading_lock = threading.Lock()
        # Hardware accelerator info
        self._accelerators: Optional[Dict] = None

    def get_available_models(self) -> Dict[str, Any]:
        """Returns the dictionary of all supported models and their metadata (JSON-safe)."""
        result = {}
        for k, v in self.AVAILABLE_MODELS.items():
            model_info = {key: val for key, val in v.items() if key != "engine_class"}
            
            # Add dynamic status info
            model_info["is_loaded"] = (k in self.loaded_engines and self.loaded_engines[k].is_loaded)
            if model_info["is_loaded"]:
                model_info["device"] = self.loaded_engines[k].device
                
            result[k] = model_info
        return result

    def get_accelerator_info(self) -> Dict[str, Any]:
        """Detect and return info about available hardware accelerators."""
        if self._accelerators is None:
            self._accelerators = detect_accelerators()
        return self._accelerators

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
        
        # Use real download progress tracking
        progress_manager = get_progress_manager()
        tracker = HFProgressTracker(
            progress_callback=create_hf_progress_callback(model_id, progress_manager)
        )
        
        with tracker.patch_download():
            new_engine.load()
        
        progress_manager.mark_complete(model_id)
        
        self.active_model_id = model_id
        self.loaded_engines[model_id] = new_engine
        return new_engine

    def unload_model(self, model_id: str) -> bool:
        """
        Explicitly unloads a model from VRAM.
        """
        if model_id not in self.loaded_engines:
            logger.warning(f"Model {model_id} not in loaded cache.")
            return False

        logger.info(f"Explicitly unloading model: {model_id}")
        engine = self.loaded_engines.pop(model_id)
        engine.unload()

        if self.active_model_id == model_id:
            self.active_model_id = None

        gc.collect()
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except ImportError:
            pass

        return True

    # ─────────────────────────────────────
    #  Streaming load with REAL progress
    # ─────────────────────────────────────
    def load_model_with_progress(self, model_id: str) -> Generator[LoadProgress, None, None]:
        """
        Generator that yields LoadProgress events as the model is loaded.
        Uses REAL download progress tracking via HFProgressTracker.
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

        # ── Phase 3: Check HF cache ──
        yield LoadProgress(phase="downloading", percent=15, message=f"Checking local cache for {hf_model_id}...",
                           model_id=model_id, model_name=model_name, total_mb=total_mb, downloaded_mb=0)

        # Check if model is already cached
        cached = False
        try:
            from huggingface_hub import scan_cache_dir
            try:
                cache_info = scan_cache_dir()
                for repo_info in cache_info.repos:
                    if hf_model_id.lower().replace("/", "--") in str(repo_info.repo_id).lower().replace("/", "--"):
                        cached = True
                        break
            except Exception:
                pass

            if cached:
                yield LoadProgress(phase="downloading", percent=65, message="Model found in local cache ✓",
                                   model_id=model_id, model_name=model_name,
                                   total_mb=total_mb, downloaded_mb=total_mb, speed_mbps=0)
        except ImportError:
            pass

        if not cached:
            # Use REAL progress tracking via HFProgressTracker
            yield LoadProgress(phase="downloading", percent=20, message=f"Downloading {hf_model_id}...",
                               model_id=model_id, model_name=model_name, total_mb=total_mb, downloaded_mb=0)
            # NOTE: The actual download happens inside engine.load() below,
            # monitored by HFProgressTracker

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

            # Use REAL download progress tracking
            progress_manager = get_progress_manager()
            tracker = HFProgressTracker(
                progress_callback=create_hf_progress_callback(model_id, progress_manager)
            )
            
            with tracker.patch_download():
                new_engine.load()

            progress_manager.mark_complete(model_id)

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
