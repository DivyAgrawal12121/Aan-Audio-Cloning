"""
Resound Studio - Voice Profile Management
==========================================
Business logic for creating, reading, updating, and deleting voice profiles
and their associated audio samples.
"""

import json
import os
import shutil
import logging
from pathlib import Path
from typing import Optional, List

from sqlalchemy.orm import Session
from sqlalchemy import func

from database import VoiceProfile, ProfileSample, DATA_DIR
from schemas import VoiceProfileCreate, VoiceProfileUpdate

logger = logging.getLogger("resound-studio")

# Directory for voice profile data (audio samples, embeddings, avatars)
PROFILES_DIR = DATA_DIR / "profiles"
PROFILES_DIR.mkdir(parents=True, exist_ok=True)


def _get_profile_dir(profile_id: str) -> Path:
    """Get the directory for a profile's data files."""
    d = PROFILES_DIR / profile_id
    d.mkdir(parents=True, exist_ok=True)
    return d


# ============================================
# PROFILE CRUD
# ============================================

def create_profile(
    data: VoiceProfileCreate,
    engine_id: str,
    db: Session,
) -> VoiceProfile:
    """Create a new voice profile."""
    profile = VoiceProfile(
        name=data.name,
        description=data.description,
        language=data.language,
        tags=json.dumps(data.tags),
        channel_id=data.channel_id,
        engine_id=engine_id,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    _get_profile_dir(profile.id)
    logger.info(f"Created voice profile: {profile.id} ({profile.name})")
    return profile


def get_profile(profile_id: str, db: Session) -> Optional[VoiceProfile]:
    """Get a voice profile by ID."""
    return db.query(VoiceProfile).filter(VoiceProfile.id == profile_id).first()


def list_profiles(db: Session) -> List[dict]:
    """List all voice profiles with sample counts."""
    profiles = (
        db.query(VoiceProfile)
        .order_by(VoiceProfile.created_at.desc())
        .all()
    )
    results = []
    for p in profiles:
        sample_count = (
            db.query(func.count(ProfileSample.id))
            .filter(ProfileSample.profile_id == p.id)
            .scalar()
        )
        results.append(_profile_to_dict(p, sample_count))
    return results


def update_profile(
    profile_id: str,
    data: VoiceProfileUpdate,
    db: Session,
) -> Optional[VoiceProfile]:
    """Update a voice profile's metadata."""
    profile = get_profile(profile_id, db)
    if not profile:
        return None

    if data.name is not None:
        profile.name = data.name
    if data.description is not None:
        profile.description = data.description
    if data.language is not None:
        profile.language = data.language
    if data.tags is not None:
        profile.tags = json.dumps(data.tags)
    if hasattr(data, 'channel_id') and data.channel_id is not None:
        profile.channel_id = data.channel_id

    db.commit()
    db.refresh(profile)
    logger.info(f"Updated voice profile: {profile_id}")
    return profile


def delete_profile(profile_id: str, db: Session) -> bool:
    """Delete a voice profile and all associated data."""
    profile = get_profile(profile_id, db)
    if not profile:
        return False

    # Delete all samples from DB
    db.query(ProfileSample).filter(ProfileSample.profile_id == profile_id).delete()

    # Delete profile from DB
    db.delete(profile)
    db.commit()

    # Delete file data
    profile_dir = PROFILES_DIR / profile_id
    if profile_dir.exists():
        shutil.rmtree(profile_dir)

    logger.info(f"Deleted voice profile: {profile_id}")
    return True


# ============================================
# SAMPLE MANAGEMENT
# ============================================

def add_sample(
    profile_id: str,
    audio_bytes: bytes,
    embedding_bytes: Optional[bytes],
    reference_text: str,
    duration_seconds: Optional[float],
    is_primary: bool,
    db: Session,
) -> Optional[ProfileSample]:
    """Add an audio sample to a voice profile."""
    profile = get_profile(profile_id, db)
    if not profile:
        return None

    import uuid
    sample_id = str(uuid.uuid4())
    profile_dir = _get_profile_dir(profile_id)

    # Save audio file
    audio_path = profile_dir / f"{sample_id}.wav"
    audio_path.write_bytes(audio_bytes)

    # Save embedding if provided
    embedding_path = None
    if embedding_bytes:
        emb_path = profile_dir / f"{sample_id}.pt"
        emb_path.write_bytes(embedding_bytes)
        embedding_path = str(emb_path)

    # If this is primary, unset other primaries
    if is_primary:
        db.query(ProfileSample).filter(
            ProfileSample.profile_id == profile_id,
            ProfileSample.is_primary == True,
        ).update({"is_primary": False})

    sample = ProfileSample(
        id=sample_id,
        profile_id=profile_id,
        audio_path=str(audio_path),
        embedding_path=embedding_path,
        reference_text=reference_text,
        duration_seconds=duration_seconds,
        is_primary=is_primary,
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)

    logger.info(f"Added sample {sample_id} to profile {profile_id}")
    return sample


def get_samples(profile_id: str, db: Session) -> List[ProfileSample]:
    """Get all audio samples for a profile."""
    return (
        db.query(ProfileSample)
        .filter(ProfileSample.profile_id == profile_id)
        .order_by(ProfileSample.created_at.asc())
        .all()
    )


def get_primary_sample(profile_id: str, db: Session) -> Optional[ProfileSample]:
    """Get the primary sample for a profile, or the first sample."""
    primary = (
        db.query(ProfileSample)
        .filter(
            ProfileSample.profile_id == profile_id,
            ProfileSample.is_primary == True,
        )
        .first()
    )
    if primary:
        return primary
    # Fall back to first sample
    return (
        db.query(ProfileSample)
        .filter(ProfileSample.profile_id == profile_id)
        .order_by(ProfileSample.created_at.asc())
        .first()
    )


def delete_sample(sample_id: str, db: Session) -> bool:
    """Delete an audio sample."""
    sample = db.query(ProfileSample).filter(ProfileSample.id == sample_id).first()
    if not sample:
        return False

    # Delete files
    if sample.audio_path and os.path.exists(sample.audio_path):
        os.remove(sample.audio_path)
    if sample.embedding_path and os.path.exists(sample.embedding_path):
        os.remove(sample.embedding_path)

    db.delete(sample)
    db.commit()
    logger.info(f"Deleted sample: {sample_id}")
    return True


# ============================================
# LEGACY COMPATIBILITY - MIGRATION HELPERS
# ============================================

def migrate_from_voice_store(db: Session):
    """
    One-time migration: read existing flat-file voices from data/voices/
    and import them into the new database.
    """
    legacy_dir = DATA_DIR / "voices"
    if not legacy_dir.exists():
        return 0

    imported = 0
    for entry in legacy_dir.iterdir():
        if not entry.is_dir():
            continue

        meta_file = entry / "meta.json"
        if not meta_file.exists():
            continue

        # Skip if already migrated
        voice_id = entry.name
        existing = get_profile(voice_id, db)
        if existing:
            continue

        with open(meta_file, "r", encoding="utf-8") as f:
            meta = json.load(f)

        # Create profile with original ID
        profile = VoiceProfile(
            id=voice_id,
            name=meta.get("name", "Unknown"),
            description=meta.get("description", ""),
            language=meta.get("language", "English"),
            tags=json.dumps(meta.get("tags", [])),
            engine_id=meta.get("clonedWithEngine", "unknown"),
        )
        db.add(profile)
        db.flush()

        # Create profile directory
        profile_dir = _get_profile_dir(voice_id)

        # Copy embedding and sample to new location
        embedding_src = entry / "embedding.pt"
        sample_src = entry / "sample.wav"

        embedding_path = None
        if embedding_src.exists():
            embedding_dst = profile_dir / "primary.pt"
            shutil.copy2(embedding_src, embedding_dst)
            embedding_path = str(embedding_dst)

        audio_path = None
        if sample_src.exists():
            audio_dst = profile_dir / "primary.wav"
            shutil.copy2(sample_src, audio_dst)
            audio_path = str(audio_dst)

        if audio_path:
            sample = ProfileSample(
                profile_id=voice_id,
                audio_path=audio_path,
                embedding_path=embedding_path,
                reference_text="",
                is_primary=True,
            )
            db.add(sample)

        imported += 1

    db.commit()
    logger.info(f"Migrated {imported} voices from legacy flat-file store")
    return imported


# ============================================
# HELPERS
# ============================================

def _profile_to_dict(profile: VoiceProfile, sample_count: int = 0) -> dict:
    """Convert a VoiceProfile ORM object to a dict for API responses."""
    try:
        tags = json.loads(profile.tags) if profile.tags else []
    except (json.JSONDecodeError, TypeError):
        tags = []

    return {
        "id": profile.id,
        "name": profile.name,
        "description": profile.description or "",
        "language": profile.language or "English",
        "tags": tags,
        "avatar_path": profile.avatar_path,
        "engine_id": profile.engine_id or "unknown",
        "channel_id": profile.channel_id,
        "sample_count": sample_count,
        "createdAt": profile.created_at.isoformat() + "Z" if profile.created_at else None,
        "updatedAt": profile.updated_at.isoformat() + "Z" if profile.updated_at else None,
    }


def get_profile_embedding_path(profile_id: str, db: Session) -> Optional[str]:
    """Get the embedding path for a profile's primary sample."""
    sample = get_primary_sample(profile_id, db)
    if sample and sample.embedding_path and os.path.exists(sample.embedding_path):
        return sample.embedding_path
    return None


def get_profile_sample_path(profile_id: str, db: Session) -> Optional[str]:
    """Get the audio path for a profile's primary sample."""
    sample = get_primary_sample(profile_id, db)
    if sample and sample.audio_path and os.path.exists(sample.audio_path):
        return sample.audio_path
    return None
