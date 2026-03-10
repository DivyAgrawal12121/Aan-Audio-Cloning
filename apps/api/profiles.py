"""
Resound Studio - Voice Profile Management
==========================================
Business logic for creating, reading, updating, and deleting voice profiles
and their associated audio samples.

Phase 0 enhancements:
  - Multi-sample voice combining (concatenate + normalize all samples)
  - Cache invalidation on sample add/delete
  - Profile import/export (.resound.zip)
"""

import json
import os
import io
import hashlib
import shutil
import zipfile
import logging
from pathlib import Path
from typing import Optional, List, Tuple

import numpy as np
import soundfile as sf

from sqlalchemy.orm import Session
from sqlalchemy import func

from database import VoiceProfile, ProfileSample, DATA_DIR
from schemas import VoiceProfileCreate, VoiceProfileUpdate
from utils.audio_utils import load_audio, normalize_audio

logger = logging.getLogger("resound-studio")

# Directory for voice profile data (audio samples, embeddings, avatars)
PROFILES_DIR = DATA_DIR / "profiles"
PROFILES_DIR.mkdir(parents=True, exist_ok=True)

# Directory for combined voice prompt cache
COMBINED_CACHE_DIR = DATA_DIR / "combined_cache"
COMBINED_CACHE_DIR.mkdir(parents=True, exist_ok=True)


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

    # Invalidate combined cache when samples change
    _invalidate_combined_cache(profile_id)

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
    """Delete an audio sample and invalidate combined cache."""
    sample = db.query(ProfileSample).filter(ProfileSample.id == sample_id).first()
    if not sample:
        return False

    profile_id = sample.profile_id

    # Delete files
    if sample.audio_path and os.path.exists(sample.audio_path):
        os.remove(sample.audio_path)
    if sample.embedding_path and os.path.exists(sample.embedding_path):
        os.remove(sample.embedding_path)

    db.delete(sample)
    db.commit()

    # Invalidate combined cache for this profile
    _invalidate_combined_cache(profile_id)

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


# ============================================
# MULTI-SAMPLE COMBINING (Phase 0D)
# ============================================

def create_combined_voice_prompt(
    profile_id: str,
    db: Session,
    engine=None,
) -> Optional[dict]:
    """
    Combine ALL samples from a profile into a single mega-reference for cloning.
    
    - Single sample: use directly (no combining needed)
    - Multi-sample: concatenate normalized audio + join reference texts
    - Cache the combined result per-profile
    
    Returns:
        dict with 'prompt_bytes', 'sample_rate', 'reference_text'
        or None if no samples exist.
    """
    samples = get_samples(profile_id, db)
    if not samples:
        return None

    if len(samples) == 1:
        # Single sample — use primary embedding directly
        sample = samples[0]
        if sample.embedding_path and os.path.exists(sample.embedding_path):
            with open(sample.embedding_path, "rb") as f:
                return {
                    "prompt_bytes": f.read(),
                    "sample_rate": 24000,
                    "reference_text": sample.reference_text or "",
                }
        return None

    # Multi-sample path — check cache first
    cache_hash = _compute_samples_hash(samples)
    combined_prompt_path = COMBINED_CACHE_DIR / f"combined_{profile_id}_{cache_hash}.pt"
    combined_audio_path = COMBINED_CACHE_DIR / f"combined_{profile_id}_{cache_hash}.wav"

    if combined_prompt_path.exists():
        logger.info(f"Using cached combined prompt for profile {profile_id}")
        with open(combined_prompt_path, "rb") as f:
            combined_text = " ".join(
                s.reference_text for s in samples if s.reference_text
            )
            return {
                "prompt_bytes": f.read(),
                "sample_rate": 24000,
                "reference_text": combined_text,
            }

    # Combine all samples
    logger.info(f"Combining {len(samples)} samples for profile {profile_id}")
    combined_audio = []
    combined_texts = []

    for sample in samples:
        if not sample.audio_path or not os.path.exists(sample.audio_path):
            continue
        try:
            audio, sr = load_audio(sample.audio_path, sample_rate=24000)
            audio = normalize_audio(audio)  # Normalize EACH sample
            combined_audio.append(audio)
            if sample.reference_text:
                combined_texts.append(sample.reference_text)
        except Exception as e:
            logger.warning(f"Failed to load sample {sample.id}: {e}")

    if not combined_audio:
        return None

    # Concatenate and normalize the combined result
    mixed = np.concatenate(combined_audio)
    mixed = normalize_audio(mixed)  # Normalize combined
    combined_text = " ".join(combined_texts)

    # Save combined audio
    sf.write(str(combined_audio_path), mixed, 24000)
    logger.info(f"Combined audio: {len(mixed)/24000:.1f}s from {len(combined_audio)} samples")

    # Create voice prompt from combined reference using the engine
    if engine is not None:
        try:
            with open(combined_audio_path, "rb") as f:
                combined_bytes = f.read()
            clone_result = engine.clone_voice(combined_bytes, ref_text=combined_text)
            
            # Cache the combined prompt
            with open(combined_prompt_path, "wb") as f:
                f.write(clone_result["prompt_bytes"])
            
            return clone_result
        except Exception as e:
            logger.error(f"Failed to create combined voice prompt: {e}")
            # Fall back to primary sample
            primary = get_primary_sample(profile_id, db)
            if primary and primary.embedding_path and os.path.exists(primary.embedding_path):
                with open(primary.embedding_path, "rb") as f:
                    return {
                        "prompt_bytes": f.read(),
                        "sample_rate": 24000,
                        "reference_text": primary.reference_text or "",
                    }

    return None


def _compute_samples_hash(samples: List[ProfileSample]) -> str:
    """Compute a hash of all sample IDs + timestamps for cache invalidation."""
    h = hashlib.md5()
    for s in sorted(samples, key=lambda x: x.id):
        h.update(s.id.encode())
        if s.created_at:
            h.update(str(s.created_at.timestamp()).encode())
    return h.hexdigest()[:12]


def _invalidate_combined_cache(profile_id: str):
    """Remove all combined cache files for a profile."""
    try:
        for f in COMBINED_CACHE_DIR.glob(f"combined_{profile_id}_*"):
            f.unlink(missing_ok=True)
        
        # Also invalidate voice prompt cache if available
        try:
            from utils.voice_prompt_cache import get_prompt_cache
            get_prompt_cache().clear_profile_cache(profile_id)
        except Exception:
            pass
        
        logger.debug(f"Combined cache invalidated for profile {profile_id}")
    except Exception as e:
        logger.warning(f"Failed to invalidate combined cache: {e}")


# ============================================
# PROFILE IMPORT/EXPORT (.resound.zip)
# ============================================

def export_profile(profile_id: str, db: Session) -> Optional[bytes]:
    """
    Export a voice profile as a .resound.zip file.
    Contains: metadata.json, sample WAV files, embedding .pt files, avatar (if any).
    """
    profile = get_profile(profile_id, db)
    if not profile:
        return None

    samples = get_samples(profile_id, db)
    
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Metadata
        try:
            tags = json.loads(profile.tags) if profile.tags else []
        except (json.JSONDecodeError, TypeError):
            tags = []

        metadata = {
            "name": profile.name,
            "description": profile.description or "",
            "language": profile.language or "English",
            "tags": tags,
            "engine_id": profile.engine_id or "unknown",
            "sample_count": len(samples),
            "exported_at": None,  # Will be set by caller
        }
        import datetime
        metadata["exported_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        zf.writestr("metadata.json", json.dumps(metadata, indent=2))

        # Samples
        for i, sample in enumerate(samples):
            sample_meta = {
                "reference_text": sample.reference_text or "",
                "duration_seconds": sample.duration_seconds,
                "is_primary": sample.is_primary,
            }
            zf.writestr(f"samples/{i}/meta.json", json.dumps(sample_meta, indent=2))

            if sample.audio_path and os.path.exists(sample.audio_path):
                zf.write(sample.audio_path, f"samples/{i}/audio.wav")
            if sample.embedding_path and os.path.exists(sample.embedding_path):
                zf.write(sample.embedding_path, f"samples/{i}/embedding.pt")

        # Avatar
        if profile.avatar_path and os.path.exists(profile.avatar_path):
            ext = os.path.splitext(profile.avatar_path)[1]
            zf.write(profile.avatar_path, f"avatar{ext}")

    buffer.seek(0)
    logger.info(f"Exported profile {profile_id}: {len(samples)} samples, {buffer.getbuffer().nbytes} bytes")
    return buffer.getvalue()


def import_profile(
    zip_bytes: bytes,
    engine_id: str,
    db: Session,
) -> Optional[VoiceProfile]:
    """
    Import a voice profile from a .resound.zip file.
    """
    buffer = io.BytesIO(zip_bytes)
    
    try:
        with zipfile.ZipFile(buffer, "r") as zf:
            # Read metadata
            metadata = json.loads(zf.read("metadata.json"))
            
            # Create profile
            profile_data = VoiceProfileCreate(
                name=metadata.get("name", "Imported Voice"),
                description=metadata.get("description", ""),
                language=metadata.get("language", "English"),
                tags=metadata.get("tags", ["imported"]),
            )
            profile = create_profile(
                data=profile_data,
                engine_id=engine_id,
                db=db,
            )

            profile_dir = _get_profile_dir(profile.id)

            # Import samples
            sample_dirs = sorted(
                [n for n in zf.namelist() if n.startswith("samples/") and n.endswith("/meta.json")]
            )
            
            for meta_path in sample_dirs:
                sample_dir = os.path.dirname(meta_path)
                sample_meta = json.loads(zf.read(meta_path))
                
                import uuid
                sample_id = str(uuid.uuid4())
                
                # Extract audio
                audio_zip_path = f"{sample_dir}/audio.wav"
                audio_path = None
                audio_bytes = None
                if audio_zip_path in zf.namelist():
                    audio_bytes = zf.read(audio_zip_path)
                    audio_path = profile_dir / f"{sample_id}.wav"
                    audio_path.write_bytes(audio_bytes)

                # Extract embedding
                emb_zip_path = f"{sample_dir}/embedding.pt"
                embedding_path = None
                if emb_zip_path in zf.namelist():
                    emb_bytes = zf.read(emb_zip_path)
                    emb_path = profile_dir / f"{sample_id}.pt"
                    emb_path.write_bytes(emb_bytes)
                    embedding_path = str(emb_path)

                if audio_path:
                    sample = ProfileSample(
                        id=sample_id,
                        profile_id=profile.id,
                        audio_path=str(audio_path),
                        embedding_path=embedding_path,
                        reference_text=sample_meta.get("reference_text", ""),
                        duration_seconds=sample_meta.get("duration_seconds"),
                        is_primary=sample_meta.get("is_primary", False),
                    )
                    db.add(sample)

            # Extract avatar
            avatar_files = [n for n in zf.namelist() if n.startswith("avatar")]
            if avatar_files:
                avatar_name = avatar_files[0]
                ext = os.path.splitext(avatar_name)[1]
                avatar_path = profile_dir / f"avatar{ext}"
                avatar_path.write_bytes(zf.read(avatar_name))
                profile.avatar_path = str(avatar_path)

            db.commit()
            db.refresh(profile)
            logger.info(f"Imported profile {profile.id}: {metadata.get('name')}")
            return profile

    except Exception as e:
        logger.error(f"Failed to import profile: {e}", exc_info=True)
        db.rollback()
        return None
