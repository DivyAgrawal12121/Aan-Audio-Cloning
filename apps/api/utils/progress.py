"""
Resound Studio - Progress Manager (SSE Pub/Sub)
==================================================
Thread-safe progress tracking with SSE streaming support.

Features:
  - asyncio.Queue per subscriber (maxsize=10)
  - Throttled updates: 0.5s interval OR ≥1% change
  - Thread-safe bridging from background threads to event loop
  - Heartbeat: sends ": heartbeat\\n\\n" every 1s to prevent connection drops
  - Lifecycle: update_progress → mark_complete / mark_error
"""

import asyncio
import json
import logging
import time
import threading
from dataclasses import dataclass, asdict
from typing import AsyncGenerator, Dict, Optional

logger = logging.getLogger("resound-studio.utils.progress")


@dataclass
class ProgressState:
    """Current progress state for a model operation."""
    model_name: str
    status: str = "idle"  # "downloading", "loading", "complete", "error"
    progress: float = 0.0  # 0-100
    current_bytes: int = 0
    total_bytes: int = 0
    filename: str = ""
    message: str = ""
    speed_mbps: float = 0.0
    eta_seconds: float = 0.0
    timestamp: float = 0.0

    def to_sse(self) -> str:
        return f"data: {json.dumps(asdict(self))}\n\n"


class ProgressManager:
    """
    Thread-safe SSE progress pub/sub manager.
    
    Background threads call update_progress() which bridges to the
    async event loop via call_soon_threadsafe.
    """

    def __init__(self):
        self._states: Dict[str, ProgressState] = {}
        self._subscribers: Dict[str, list[asyncio.Queue]] = {}
        self._lock = threading.Lock()
        self._last_update_time: Dict[str, float] = {}
        self._last_update_progress: Dict[str, float] = {}
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        """Set the event loop for thread-safe bridging."""
        self._loop = loop

    def update_progress(
        self,
        model_name: str,
        current: int,
        total: int,
        filename: str = "",
        status: str = "downloading",
        message: str = "",
    ):
        """
        Update progress for a model. Called from any thread.
        Throttles updates to max every 0.5s or ≥1% change.
        """
        now = time.time()
        progress = (current / total * 100) if total > 0 else 0

        # Throttling: skip if <0.5s and <1% change
        last_time = self._last_update_time.get(model_name, 0)
        last_progress = self._last_update_progress.get(model_name, -1)
        
        time_delta = now - last_time
        progress_delta = abs(progress - last_progress)
        
        if time_delta < 0.5 and progress_delta < 1.0:
            return  # Skip this update (throttled)

        self._last_update_time[model_name] = now
        self._last_update_progress[model_name] = progress

        # Calculate speed
        speed_mbps = 0.0
        if last_time > 0 and time_delta > 0:
            bytes_delta = current - self._states.get(model_name, ProgressState(model_name)).current_bytes
            if bytes_delta > 0:
                speed_mbps = round(bytes_delta / time_delta / 1_000_000, 2)

        # Calculate ETA
        eta = 0.0
        if speed_mbps > 0 and total > current:
            remaining_mb = (total - current) / 1_000_000
            eta = round(remaining_mb / speed_mbps, 1)

        state = ProgressState(
            model_name=model_name,
            status=status,
            progress=round(progress, 1),
            current_bytes=current,
            total_bytes=total,
            filename=filename,
            message=message or f"Downloading {filename}",
            speed_mbps=speed_mbps,
            eta_seconds=eta,
            timestamp=now,
        )

        with self._lock:
            self._states[model_name] = state

        # Notify subscribers
        self._notify(model_name, state)

    def mark_complete(self, model_name: str, message: str = "Model loaded successfully"):
        """Mark a model operation as complete."""
        state = ProgressState(
            model_name=model_name,
            status="complete",
            progress=100.0,
            message=message,
            timestamp=time.time(),
        )
        with self._lock:
            self._states[model_name] = state
        self._notify(model_name, state)
        logger.info(f"Progress complete: {model_name}")

    def mark_error(self, model_name: str, error: str):
        """Mark a model operation as failed."""
        state = ProgressState(
            model_name=model_name,
            status="error",
            progress=0.0,
            message=f"Error: {error}",
            timestamp=time.time(),
        )
        with self._lock:
            self._states[model_name] = state
        self._notify(model_name, state)
        logger.error(f"Progress error: {model_name} — {error}")

    def get_state(self, model_name: str) -> Optional[ProgressState]:
        """Get current progress state for a model."""
        with self._lock:
            return self._states.get(model_name)

    async def subscribe(self, model_name: str) -> AsyncGenerator[str, None]:
        """
        Subscribe to progress updates for a model.
        Yields SSE-formatted strings.
        Sends heartbeat every 1s to prevent connection drops.
        """
        queue: asyncio.Queue = asyncio.Queue(maxsize=10)

        with self._lock:
            if model_name not in self._subscribers:
                self._subscribers[model_name] = []
            self._subscribers[model_name].append(queue)

        try:
            # Send current state immediately if available
            current = self.get_state(model_name)
            if current:
                yield current.to_sse()

            while True:
                try:
                    # Wait for next event with 1s timeout for heartbeat
                    state: ProgressState = await asyncio.wait_for(queue.get(), timeout=1.0)
                    yield state.to_sse()

                    # Stop streaming when complete or error
                    if state.status in ("complete", "error"):
                        break

                except asyncio.TimeoutError:
                    # Send heartbeat to keep connection alive
                    yield ": heartbeat\n\n"

        finally:
            with self._lock:
                subs = self._subscribers.get(model_name, [])
                if queue in subs:
                    subs.remove(queue)

    def _notify(self, model_name: str, state: ProgressState):
        """Send state to all subscribers for a model. Thread-safe."""
        with self._lock:
            subscribers = list(self._subscribers.get(model_name, []))

        for queue in subscribers:
            if self._loop and not self._loop.is_closed():
                try:
                    self._loop.call_soon_threadsafe(self._safe_put, queue, state)
                except RuntimeError:
                    # Event loop is closed
                    pass
            else:
                # Fallback: try direct put (only works from async context)
                try:
                    queue.put_nowait(state)
                except asyncio.QueueFull:
                    pass  # Drop oldest if full

    @staticmethod
    def _safe_put(queue: asyncio.Queue, state: ProgressState):
        """Safely put state into queue, dropping oldest if full."""
        try:
            queue.put_nowait(state)
        except asyncio.QueueFull:
            try:
                queue.get_nowait()  # Drop oldest
                queue.put_nowait(state)
            except (asyncio.QueueEmpty, asyncio.QueueFull):
                pass


def create_hf_progress_callback(model_name: str, progress_manager: ProgressManager):
    """
    Create a callback function compatible with HFProgressTracker.
    
    Returns a function with signature: callback(downloaded_bytes, total_bytes, filename)
    """
    def callback(downloaded_bytes: int, total_bytes: int, filename: str):
        progress_manager.update_progress(
            model_name=model_name,
            current=downloaded_bytes,
            total=total_bytes,
            filename=filename,
            status="downloading",
        )
    return callback


# Global singleton
_manager: Optional[ProgressManager] = None


def get_progress_manager() -> ProgressManager:
    """Get the global progress manager singleton."""
    global _manager
    if _manager is None:
        _manager = ProgressManager()
    return _manager
