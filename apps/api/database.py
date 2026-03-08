"""
Resound Studio - Database Layer
================================
SQLite + SQLAlchemy ORM for persistent storage of voice profiles,
audio samples, generation history, stories, and projects.
"""

import os
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    create_engine,
    Column,
    String,
    Integer,
    Float,
    DateTime,
    Text,
    Boolean,
    ForeignKey,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pathlib import Path

# ---- Config ----
DATA_DIR = Path(os.path.dirname(__file__)) / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "resound.db"

Base = declarative_base()

def _uuid() -> str:
    return str(uuid.uuid4())

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ============================================
# ORM MODELS
# ============================================

class VoiceProfile(Base):
    """Voice profile — a named voice identity with metadata."""
    __tablename__ = "voice_profiles"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    language = Column(String, default="English")
    tags = Column(Text, default="[]")           # JSON array stored as text
    avatar_path = Column(String, nullable=True)
    engine_id = Column(String, default="unknown")
    channel_id = Column(String, ForeignKey("audio_channels.id"), nullable=True)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


class ProfileSample(Base):
    """Audio sample belonging to a voice profile."""
    __tablename__ = "profile_samples"

    id = Column(String, primary_key=True, default=_uuid)
    profile_id = Column(String, ForeignKey("voice_profiles.id"), nullable=False)
    audio_path = Column(String, nullable=False)       # path to WAV file on disk
    embedding_path = Column(String, nullable=True)     # path to embedding .pt file
    reference_text = Column(Text, default="")
    duration_seconds = Column(Float, nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utcnow)


class Generation(Base):
    """Record of a TTS generation for history tracking."""
    __tablename__ = "generations"

    id = Column(String, primary_key=True, default=_uuid)
    profile_id = Column(String, ForeignKey("voice_profiles.id"), nullable=False)
    text = Column(Text, nullable=False)
    language = Column(String, default="English")
    emotion = Column(String, default="neutral")
    speed = Column(Float, default=1.0)
    pitch = Column(Float, default=1.0)
    style = Column(Text, nullable=True)
    engine_id = Column(String, default="unknown")
    audio_path = Column(String, nullable=False)       # path to generated WAV
    duration_seconds = Column(Float, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=_utcnow)


class Story(Base):
    """Multi-voice composition / story project."""
    __tablename__ = "stories"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


class StoryItem(Base):
    """A single clip/generation placed in a story timeline."""
    __tablename__ = "story_items"

    id = Column(String, primary_key=True, default=_uuid)
    story_id = Column(String, ForeignKey("stories.id"), nullable=False)
    generation_id = Column(String, ForeignKey("generations.id"), nullable=False)
    position_ms = Column(Integer, nullable=False, default=0)
    track = Column(Integer, nullable=False, default=0)
    trim_start_ms = Column(Integer, nullable=False, default=0)
    trim_end_ms = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=_utcnow)


class AudioChannel(Base):
    """Audio routing channel for directing specific voices to specific hardware devices."""
    __tablename__ = "audio_channels"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    color = Column(String, default="#3b82f6")  # tailwind blue-500
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)


# ============================================
# DATABASE INITIALISATION
# ============================================

_engine = None
_SessionLocal = None


def init_db():
    """Create all tables and return the engine."""
    global _engine, _SessionLocal
    _engine = create_engine(
        f"sqlite:///{DB_PATH}",
        connect_args={"check_same_thread": False},
        echo=False,
    )
    Base.metadata.create_all(bind=_engine)
    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _engine


def get_db():
    """Yield a database session (for FastAPI dependency injection)."""
    if _SessionLocal is None:
        init_db()
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_session() -> Session:
    """Get a standalone session (not a generator — for non-FastAPI usage)."""
    if _SessionLocal is None:
        init_db()
    return _SessionLocal()
