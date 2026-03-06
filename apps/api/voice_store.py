"""
VoxForge - Voice Storage Manager
=================================
Manages saving, loading, and deleting voice embeddings and metadata on local disk.
"""

import json
import os
import uuid
from datetime import datetime
from typing import Optional


VOICES_DIR = os.path.join(os.path.dirname(__file__), "data", "voices")
os.makedirs(VOICES_DIR, exist_ok=True)


def _meta_path(voice_id: str) -> str:
    return os.path.join(VOICES_DIR, voice_id, "meta.json")


def _embedding_path(voice_id: str) -> str:
    return os.path.join(VOICES_DIR, voice_id, "embedding.pt")


def _audio_path(voice_id: str) -> str:
    return os.path.join(VOICES_DIR, voice_id, "sample.wav")


def save_voice(
    name: str,
    description: str,
    language: str,
    tags: list[str],
    embedding_data: bytes,
    audio_sample: Optional[bytes] = None,
) -> dict:
    """Save a voice embedding and metadata to disk. Returns the voice record."""
    voice_id = str(uuid.uuid4())
    voice_dir = os.path.join(VOICES_DIR, voice_id)
    os.makedirs(voice_dir, exist_ok=True)

    # Save embedding
    with open(_embedding_path(voice_id), "wb") as f:
        f.write(embedding_data)

    # Save audio sample if provided
    if audio_sample:
        with open(_audio_path(voice_id), "wb") as f:
            f.write(audio_sample)

    # Save metadata
    meta = {
        "id": voice_id,
        "name": name,
        "description": description,
        "language": language,
        "tags": tags,
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "embeddingPath": _embedding_path(voice_id),
        "audioSampleUrl": f"/api/voices/{voice_id}/sample" if audio_sample else None,
    }
    with open(_meta_path(voice_id), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    return meta


def get_all_voices() -> list[dict]:
    """List all saved voices."""
    voices = []
    if not os.path.exists(VOICES_DIR):
        return voices

    for entry in os.scandir(VOICES_DIR):
        if entry.is_dir():
            meta_file = os.path.join(entry.path, "meta.json")
            if os.path.exists(meta_file):
                with open(meta_file, "r", encoding="utf-8") as f:
                    voices.append(json.load(f))

    # Sort by creation date, newest first
    voices.sort(key=lambda v: v.get("createdAt", ""), reverse=True)
    return voices


def get_voice(voice_id: str) -> Optional[dict]:
    """Get a single voice by ID."""
    meta_file = _meta_path(voice_id)
    if not os.path.exists(meta_file):
        return None
    with open(meta_file, "r", encoding="utf-8") as f:
        return json.load(f)


def get_voice_embedding_path(voice_id: str) -> Optional[str]:
    """Get the path to a voice's embedding file."""
    path = _embedding_path(voice_id)
    return path if os.path.exists(path) else None


def get_voice_sample_path(voice_id: str) -> Optional[str]:
    """Get the path to a voice's audio sample."""
    path = _audio_path(voice_id)
    return path if os.path.exists(path) else None


def delete_voice(voice_id: str) -> bool:
    """Delete a voice and all its data."""
    voice_dir = os.path.join(VOICES_DIR, voice_id)
    if not os.path.exists(voice_dir):
        return False

    import shutil
    shutil.rmtree(voice_dir)
    return True
