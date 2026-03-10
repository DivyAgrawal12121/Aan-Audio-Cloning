"""
Resound Studio - HuggingFace Download Progress Tracker
========================================================
Monkey-patches tqdm globally to intercept ALL download progress bars
created by huggingface_hub during model downloads.

Features:
  - Per-file byte tracking (file_sizes, file_downloaded)
  - Multi-file aggregation (sums across concurrent files)
  - Smart filtering (skips "Fetching N files" bars, tiny config files)
  - Min 1MB threshold to ignore tiny config/tokenizer files
  - Context manager: `with tracker.patch_download(): engine.load()`
"""

import logging
import threading
from typing import Callable, Optional

logger = logging.getLogger("resound-studio.utils.hf_progress")

# Minimum file size to track (1MB) — skip tiny configs that flash 100%
MIN_TRACK_SIZE_BYTES = 1_000_000


class HFProgressTracker:
    """
    Intercepts tqdm progress bars to extract real download progress
    from HuggingFace model downloads.
    """

    def __init__(
        self,
        progress_callback: Optional[Callable[[int, int, str], None]] = None,
    ):
        """
        Args:
            progress_callback: Called with (downloaded_bytes, total_bytes, filename)
                               whenever download progress updates.
        """
        self._callback = progress_callback
        self._file_sizes: dict[str, int] = {}
        self._file_downloaded: dict[str, int] = {}
        self._lock = threading.Lock()
        self._original_tqdm = None
        self._original_auto_tqdm = None
        self._patched = False

    @property
    def total_size(self) -> int:
        with self._lock:
            return sum(self._file_sizes.values())

    @property
    def total_downloaded(self) -> int:
        with self._lock:
            return sum(self._file_downloaded.values())

    def _should_track(self, total: Optional[int], desc: Optional[str]) -> bool:
        """Filter out non-download progress bars."""
        if total is None or total <= 0:
            return False
        # Skip "Fetching X files" bars (count files, not bytes)
        if desc and "fetching" in desc.lower():
            return False
        # Skip generation progress
        if desc and "generat" in desc.lower():
            return False
        # Skip tiny files (configs, tokenizers)
        if total < MIN_TRACK_SIZE_BYTES:
            return False
        return True

    def _on_update(self, bar_id: str, n: int, total: int, desc: str):
        """Called when a tracked tqdm bar updates."""
        with self._lock:
            self._file_sizes[bar_id] = total
            self._file_downloaded[bar_id] = min(n, total)

        if self._callback:
            try:
                self._callback(self.total_downloaded, self.total_size, desc or bar_id)
            except Exception as e:
                logger.debug(f"Progress callback error: {e}")

    def patch_download(self):
        """Context manager that patches tqdm during model downloads."""
        return _TqdmPatchContext(self)

    def reset(self):
        """Reset tracking state."""
        with self._lock:
            self._file_sizes.clear()
            self._file_downloaded.clear()


class _TqdmPatchContext:
    """Context manager that monkey-patches tqdm to intercept progress."""

    def __init__(self, tracker: HFProgressTracker):
        self._tracker = tracker
        self._originals = {}
        self._bar_counter = 0
        self._bar_lock = threading.Lock()

    def __enter__(self):
        self._tracker.reset()
        self._patch_tqdm()
        return self._tracker

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._unpatch_tqdm()
        return False

    def _patch_tqdm(self):
        """Replace tqdm classes with our intercepting wrapper."""
        tracker = self._tracker

        try:
            import tqdm as tqdm_module
            import tqdm.auto as tqdm_auto

            self._originals["tqdm.tqdm"] = tqdm_module.tqdm
            self._originals["tqdm.auto.tqdm"] = tqdm_auto.tqdm

            parent = self  # for closure

            class InterceptedTqdm(tqdm_module.tqdm):
                """tqdm subclass that reports progress to our tracker."""

                def __init__(self, *args, **kwargs):
                    super().__init__(*args, **kwargs)
                    with parent._bar_lock:
                        parent._bar_counter += 1
                        self._bar_id = f"bar_{parent._bar_counter}"

                    desc = kwargs.get("desc") or (getattr(self, "desc", None))
                    total = kwargs.get("total") or (getattr(self, "total", None))
                    self._should_track = tracker._should_track(total, desc)

                    if self._should_track and desc:
                        self._bar_id = desc

                def update(self, n=1):
                    super().update(n)
                    if self._should_track and self.total:
                        tracker._on_update(
                            self._bar_id,
                            self.n,
                            self.total,
                            getattr(self, "desc", self._bar_id),
                        )

            tqdm_module.tqdm = InterceptedTqdm
            tqdm_auto.tqdm = InterceptedTqdm

            # Also try to patch huggingface_hub's internal tqdm
            try:
                import huggingface_hub.utils.tqdm as hf_tqdm
                self._originals["hf_tqdm.tqdm"] = hf_tqdm.tqdm
                hf_tqdm.tqdm = InterceptedTqdm
            except (ImportError, AttributeError):
                pass

            logger.debug("tqdm patched for download progress tracking")

        except ImportError:
            logger.warning("tqdm not available — download progress tracking disabled")

    def _unpatch_tqdm(self):
        """Restore original tqdm classes."""
        try:
            import tqdm as tqdm_module
            import tqdm.auto as tqdm_auto

            if "tqdm.tqdm" in self._originals:
                tqdm_module.tqdm = self._originals["tqdm.tqdm"]
            if "tqdm.auto.tqdm" in self._originals:
                tqdm_auto.tqdm = self._originals["tqdm.auto.tqdm"]

            try:
                import huggingface_hub.utils.tqdm as hf_tqdm
                if "hf_tqdm.tqdm" in self._originals:
                    hf_tqdm.tqdm = self._originals["hf_tqdm.tqdm"]
            except (ImportError, AttributeError):
                pass

            logger.debug("tqdm unpatched — original progress bars restored")
        except ImportError:
            pass
