"""
Resound Studio - Voice Prompt Cache
=====================================
Two-tier caching system for voice clone prompts:
  - Tier 1: In-memory LRU dict (fast, limited by RAM)
  - Tier 2: Disk-backed .prompt files (persistent, larger capacity)

Cache key is MD5 hash of (audio_bytes + reference_text_bytes).
"""

import hashlib
import logging
import os
from collections import OrderedDict
from pathlib import Path
from typing import Any, Optional

import torch

from database import DATA_DIR

logger = logging.getLogger("resound-studio.utils.voice_prompt_cache")

# Cache directory for disk-backed prompt files
PROMPT_CACHE_DIR = DATA_DIR / "prompt_cache"
PROMPT_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Maximum number of prompts to keep in memory
MAX_MEMORY_CACHE = 50


def _compute_cache_key(audio_bytes: bytes, reference_text: str = "") -> str:
    """Compute MD5 hash of audio bytes + reference text for cache key."""
    h = hashlib.md5()
    h.update(audio_bytes)
    h.update(reference_text.encode("utf-8"))
    return h.hexdigest()


class VoicePromptCache:
    """
    Two-tier voice prompt cache.
    
    Memory (Tier 1) → Disk (Tier 2) → None (cache miss)
    """

    def __init__(self, max_memory: int = MAX_MEMORY_CACHE):
        self._memory_cache: OrderedDict[str, Any] = OrderedDict()
        self._max_memory = max_memory
        self._profile_key_map: dict[str, set[str]] = {}  # profile_id -> set of cache_keys

    def get_cached_prompt(self, cache_key: str) -> Optional[Any]:
        """
        Look up a voice prompt by cache key.
        Checks memory first, then disk.
        """
        # Tier 1: Memory
        if cache_key in self._memory_cache:
            # Move to end (most recently used)
            self._memory_cache.move_to_end(cache_key)
            logger.debug(f"Voice prompt cache HIT (memory): {cache_key[:8]}...")
            return self._memory_cache[cache_key]

        # Tier 2: Disk
        disk_path = PROMPT_CACHE_DIR / f"{cache_key}.prompt"
        if disk_path.exists():
            try:
                prompt_data = torch.load(disk_path, map_location="cpu", weights_only=False)
                # Promote to memory cache
                self._put_memory(cache_key, prompt_data)
                logger.debug(f"Voice prompt cache HIT (disk): {cache_key[:8]}...")
                return prompt_data
            except Exception as e:
                logger.warning(f"Failed to load cached prompt from disk: {e}")
                # Delete corrupted cache file
                disk_path.unlink(missing_ok=True)

        return None

    def cache_prompt(
        self, cache_key: str, prompt_data: Any, profile_id: Optional[str] = None
    ):
        """
        Store a voice prompt in both memory and disk cache.
        """
        # Memory
        self._put_memory(cache_key, prompt_data)

        # Disk
        disk_path = PROMPT_CACHE_DIR / f"{cache_key}.prompt"
        try:
            torch.save(prompt_data, str(disk_path))
            logger.debug(f"Voice prompt cached (memory + disk): {cache_key[:8]}...")
        except Exception as e:
            logger.warning(f"Failed to save prompt to disk cache: {e}")

        # Track profile → key mapping for targeted invalidation
        if profile_id:
            if profile_id not in self._profile_key_map:
                self._profile_key_map[profile_id] = set()
            self._profile_key_map[profile_id].add(cache_key)

    def get_or_compute(
        self,
        audio_bytes: bytes,
        reference_text: str,
        compute_fn,
        profile_id: Optional[str] = None,
    ) -> Any:
        """
        Get a cached prompt or compute it if not cached.
        
        Args:
            audio_bytes: Raw audio bytes for cache key computation
            reference_text: Reference text for cache key computation
            compute_fn: Callable that returns the prompt data (called on cache miss)
            profile_id: Optional profile ID for targeted cache invalidation
        
        Returns:
            The voice prompt data (from cache or freshly computed)
        """
        cache_key = _compute_cache_key(audio_bytes, reference_text)
        
        cached = self.get_cached_prompt(cache_key)
        if cached is not None:
            return cached

        # Cache miss — compute
        logger.info(f"Voice prompt cache MISS: {cache_key[:8]}... Computing...")
        prompt_data = compute_fn()
        self.cache_prompt(cache_key, prompt_data, profile_id)
        return prompt_data

    def clear_cache(self):
        """Clear all cached prompts (memory + disk)."""
        self._memory_cache.clear()
        self._profile_key_map.clear()
        
        cleared = 0
        for f in PROMPT_CACHE_DIR.glob("*.prompt"):
            try:
                f.unlink()
                cleared += 1
            except Exception:
                pass
        logger.info(f"Voice prompt cache cleared: {cleared} disk files removed")

    def clear_profile_cache(self, profile_id: str):
        """Clear cached prompts for a specific profile."""
        keys = self._profile_key_map.pop(profile_id, set())
        for key in keys:
            self._memory_cache.pop(key, None)
            disk_path = PROMPT_CACHE_DIR / f"{key}.prompt"
            disk_path.unlink(missing_ok=True)
        
        # Also clear any combined prompt cache for this profile
        combined_path = PROMPT_CACHE_DIR / f"combined_{profile_id}.wav"
        combined_path.unlink(missing_ok=True)
        combined_prompt_path = PROMPT_CACHE_DIR / f"combined_{profile_id}.prompt"
        combined_prompt_path.unlink(missing_ok=True)
        
        logger.info(f"Profile cache cleared for {profile_id}: {len(keys)} entries removed")

    def _put_memory(self, cache_key: str, data: Any):
        """Add to memory cache with LRU eviction."""
        if cache_key in self._memory_cache:
            self._memory_cache.move_to_end(cache_key)
        else:
            if len(self._memory_cache) >= self._max_memory:
                self._memory_cache.popitem(last=False)  # Evict oldest
            self._memory_cache[cache_key] = data


# Global singleton
_cache: Optional[VoicePromptCache] = None


def get_prompt_cache() -> VoicePromptCache:
    """Get the global voice prompt cache singleton."""
    global _cache
    if _cache is None:
        _cache = VoicePromptCache()
    return _cache
