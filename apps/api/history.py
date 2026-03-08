"""
Resound Studio - Generation History
=====================================
Business logic for tracking and querying TTS generation history.
"""

import os
import io
import logging
from pathlib import Path
from typing import Optional, List

import soundfile as sf
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from database import Generation, VoiceProfile, DATA_DIR

logger = logging.getLogger("resound-studio")

# Directory for generated audio files
GENERATIONS_DIR = DATA_DIR / "generations"
GENERATIONS_DIR.mkdir(parents=True, exist_ok=True)


def record_generation(
    profile_id: str,
    text: str,
    audio_bytes: bytes,
    language: str = "English",
    emotion: str = "neutral",
    speed: float = 1.0,
    pitch: float = 1.0,
    style: Optional[str] = None,
    engine_id: str = "unknown",
    db: Session = None,
) -> Optional[Generation]:
    """Record a TTS generation in history and save the audio to disk."""
    if db is None:
        return None

    import uuid
    gen_id = str(uuid.uuid4())

    # Save audio file
    audio_path = GENERATIONS_DIR / f"{gen_id}.wav"
    audio_path.write_bytes(audio_bytes)

    # Get duration from audio
    duration_seconds = None
    try:
        data, sr = sf.read(io.BytesIO(audio_bytes))
        duration_seconds = len(data) / sr
    except Exception:
        pass

    generation = Generation(
        id=gen_id,
        profile_id=profile_id,
        text=text,
        language=language,
        emotion=emotion,
        speed=speed,
        pitch=pitch,
        style=style,
        engine_id=engine_id,
        audio_path=str(audio_path),
        duration_seconds=duration_seconds,
        file_size_bytes=len(audio_bytes),
    )
    db.add(generation)
    db.commit()
    db.refresh(generation)

    logger.info(f"Recorded generation {gen_id}: {text[:50]}...")
    return generation


def get_generation(gen_id: str, db: Session) -> Optional[Generation]:
    """Get a single generation by ID."""
    return db.query(Generation).filter(Generation.id == gen_id).first()


def list_generations(
    db: Session,
    profile_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """List generation history with optional filtering."""
    query = db.query(Generation).order_by(Generation.created_at.desc())

    if profile_id:
        query = query.filter(Generation.profile_id == profile_id)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Generation.text.ilike(search_term),
                Generation.language.ilike(search_term),
                Generation.emotion.ilike(search_term),
            )
        )

    total = query.count()
    generations = query.offset(offset).limit(limit).all()

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": [_generation_to_dict(g, db) for g in generations],
    }


def delete_generation(gen_id: str, db: Session) -> bool:
    """Delete a generation and its audio file."""
    gen = get_generation(gen_id, db)
    if not gen:
        return False

    # Delete audio file
    if gen.audio_path and os.path.exists(gen.audio_path):
        os.remove(gen.audio_path)

    db.delete(gen)
    db.commit()
    logger.info(f"Deleted generation: {gen_id}")
    return True


def clear_history(db: Session, profile_id: Optional[str] = None) -> int:
    """Clear generation history (all or for a specific profile)."""
    query = db.query(Generation)
    if profile_id:
        query = query.filter(Generation.profile_id == profile_id)

    generations = query.all()
    count = len(generations)

    for gen in generations:
        if gen.audio_path and os.path.exists(gen.audio_path):
            os.remove(gen.audio_path)
        db.delete(gen)

    db.commit()
    logger.info(f"Cleared {count} generations from history")
    return count


def _generation_to_dict(gen: Generation, db: Session) -> dict:
    """Convert a Generation ORM object to a dict."""
    # Get voice name for display
    voice_name = None
    profile = db.query(VoiceProfile).filter(VoiceProfile.id == gen.profile_id).first()
    if profile:
        voice_name = profile.name

    return {
        "id": gen.id,
        "profile_id": gen.profile_id,
        "voice_name": voice_name,
        "text": gen.text,
        "language": gen.language,
        "emotion": gen.emotion,
        "speed": gen.speed,
        "pitch": gen.pitch,
        "style": gen.style,
        "engine_id": gen.engine_id,
        "audio_url": f"/api/history/{gen.id}/audio",
        "duration_seconds": gen.duration_seconds,
        "file_size_bytes": gen.file_size_bytes,
        "createdAt": gen.created_at.isoformat() + "Z" if gen.created_at else None,
    }
