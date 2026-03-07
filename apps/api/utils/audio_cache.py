"""
Resound Studio - Audio Cache
==============================
Disk-based cache for generated audio. Keyed by a hash of (text + voice_id + settings).
Prevents redundant generation for identical requests.
"""

import os
import hashlib
import json
import time
import logging
from typing import Optional

logger = logging.getLogger("resound-studio.utils.cache")

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Default TTL: 24 hours
DEFAULT_TTL_SECONDS = 86400
# Max cache size: 500 MB
MAX_CACHE_SIZE_BYTES = 500 * 1024 * 1024


def _make_key(text: str, voice_id: str, **settings) -> str:
    """Create a deterministic cache key from the request parameters."""
    payload = json.dumps({
        "text": text,
        "voice_id": voice_id,
        **{k: v for k, v in sorted(settings.items()) if v is not None}
    }, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


def _cache_path(key: str) -> str:
    return os.path.join(CACHE_DIR, f"{key}.wav")


def _meta_path(key: str) -> str:
    return os.path.join(CACHE_DIR, f"{key}.json")


def get_cached(text: str, voice_id: str, **settings) -> Optional[bytes]:
    """
    Look up cached audio for the given parameters.
    Returns audio bytes if found and not expired, else None.
    """
    key = _make_key(text, voice_id, **settings)
    audio_path = _cache_path(key)
    meta_path = _meta_path(key)

    if not os.path.exists(audio_path):
        return None

    # Check TTL
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r") as f:
                meta = json.load(f)
            created = meta.get("created", 0)
            ttl = meta.get("ttl", DEFAULT_TTL_SECONDS)
            if time.time() - created > ttl:
                # Expired — clean up
                os.unlink(audio_path)
                os.unlink(meta_path)
                logger.info(f"Cache expired for key {key[:12]}...")
                return None
        except Exception:
            pass

    try:
        with open(audio_path, "rb") as f:
            data = f.read()
        logger.info(f"Cache HIT: {key[:12]}... ({len(data)} bytes)")
        return data
    except Exception:
        return None


def put_cached(audio_bytes: bytes, text: str, voice_id: str, **settings) -> None:
    """
    Store generated audio in the cache.
    Automatically evicts oldest entries if cache exceeds MAX_CACHE_SIZE_BYTES.
    """
    key = _make_key(text, voice_id, **settings)

    # Evict if over size limit
    _evict_if_needed(len(audio_bytes))

    try:
        with open(_cache_path(key), "wb") as f:
            f.write(audio_bytes)
        with open(_meta_path(key), "w") as f:
            json.dump({
                "created": time.time(),
                "ttl": DEFAULT_TTL_SECONDS,
                "text_preview": text[:100],
                "voice_id": voice_id,
                "size_bytes": len(audio_bytes),
            }, f)
        logger.info(f"Cache PUT: {key[:12]}... ({len(audio_bytes)} bytes)")
    except Exception as e:
        logger.warning(f"Failed to cache audio: {e}")


def clear_cache() -> int:
    """Clear all cached audio. Returns number of files removed."""
    count = 0
    for f in os.listdir(CACHE_DIR):
        try:
            os.unlink(os.path.join(CACHE_DIR, f))
            count += 1
        except Exception:
            pass
    logger.info(f"Cache cleared: {count} files removed")
    return count


def get_cache_stats() -> dict:
    """Get cache statistics."""
    total_size = 0
    file_count = 0
    for f in os.listdir(CACHE_DIR):
        if f.endswith(".wav"):
            file_count += 1
            total_size += os.path.getsize(os.path.join(CACHE_DIR, f))
    return {
        "cached_items": file_count,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "max_size_mb": round(MAX_CACHE_SIZE_BYTES / (1024 * 1024), 2),
        "usage_percent": round(total_size / MAX_CACHE_SIZE_BYTES * 100, 1) if MAX_CACHE_SIZE_BYTES > 0 else 0,
    }


def _evict_if_needed(incoming_size: int) -> None:
    """Evict oldest cache entries if adding incoming_size would exceed the limit."""
    entries = []
    for f in os.listdir(CACHE_DIR):
        if f.endswith(".wav"):
            path = os.path.join(CACHE_DIR, f)
            entries.append((os.path.getmtime(path), path, f.replace(".wav", "")))

    total_size = sum(os.path.getsize(e[1]) for e in entries)

    if total_size + incoming_size <= MAX_CACHE_SIZE_BYTES:
        return

    # Sort by modification time (oldest first)
    entries.sort(key=lambda e: e[0])

    for mtime, path, key in entries:
        if total_size + incoming_size <= MAX_CACHE_SIZE_BYTES:
            break
        try:
            file_size = os.path.getsize(path)
            os.unlink(path)
            meta = _meta_path(key)
            if os.path.exists(meta):
                os.unlink(meta)
            total_size -= file_size
            logger.info(f"Evicted cache entry: {key[:12]}...")
        except Exception:
            pass
