"""
Resound Studio - Pydantic Schemas
==================================
Request/Response models for the REST API.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ============================================
# AUDIO CHANNELS
# ============================================

class AudioChannelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = "#3b82f6"

class AudioChannelUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = None

class AudioChannelResponse(BaseModel):
    id: str
    name: str
    color: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# VOICE PROFILES
# ============================================

class VoiceProfileCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    language: str = "English"
    tags: List[str] = []
    channel_id: Optional[str] = None

class VoiceProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    language: Optional[str] = None
    tags: Optional[List[str]] = None
    channel_id: Optional[str] = None

class VoiceProfileResponse(BaseModel):
    id: str
    name: str
    description: str
    language: str
    tags: List[str]
    avatar_path: Optional[str]
    engine_id: str
    channel_id: Optional[str]
    sample_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# PROFILE SAMPLES
# ============================================

class ProfileSampleResponse(BaseModel):
    id: str
    profile_id: str
    audio_path: str
    embedding_path: Optional[str]
    reference_text: str
    duration_seconds: Optional[float]
    is_primary: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# TTS GENERATION
# ============================================

class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=1)
    voiceId: str
    language: str = "English"
    emotion: str = "neutral"
    speed: float = Field(1.0, ge=0.25, le=4.0)
    pitch: float = Field(1.0, ge=0.25, le=4.0)
    duration: Optional[float] = None
    style: Optional[str] = None
    seed: Optional[int] = None  # For reproducible generation

class GenerationResponse(BaseModel):
    id: str
    profile_id: str
    text: str
    language: str
    emotion: str
    speed: float
    pitch: float
    style: Optional[str]
    engine_id: str
    audio_path: str
    duration_seconds: Optional[float]
    file_size_bytes: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# GENERATION HISTORY
# ============================================

class HistoryFilters(BaseModel):
    profile_id: Optional[str] = None
    search: Optional[str] = None
    limit: int = Field(50, ge=1, le=500)
    offset: int = Field(0, ge=0)


# ============================================
# VOICE DESIGN
# ============================================

class DesignVoiceRequest(BaseModel):
    description: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=200)
    language: str = "English"
    channel_id: Optional[str] = None

class PreviewDesignVoiceRequest(BaseModel):
    description: str = Field(..., min_length=1)
    language: str = "English"
    text: str = "Hello, this is a preview of the designed voice."


# ============================================
# VOICE PREVIEW
# ============================================

class PreviewRequest(BaseModel):
    voiceId: str
    text: str = "Hello, this is a preview of my voice."


# ============================================
# PODCAST STUDIO
# ============================================

class PodcastBlock(BaseModel):
    voice_id: str
    text: str = Field(..., min_length=1)

class PodcastTimelineRequest(BaseModel):
    story_name: str = "My New Podcast"
    language: str = "English"
    blocks: List[PodcastBlock]


# ============================================
# STREAMING / ASYNC
# ============================================

class StreamGenerateRequest(BaseModel):
    text: str
    voiceId: str
    language: str = "English"
    emotion: str = "neutral"
    speed: float = 1.0
    pitch: float = 1.0
    style: Optional[str] = None
    seed: Optional[int] = None

class AsyncGenerateRequest(BaseModel):
    text: str
    voiceId: str
    language: str = "English"
    emotion: str = "neutral"
    speed: float = 1.0
    pitch: float = 1.0
    style: Optional[str] = None
    seed: Optional[int] = None


# ============================================
# BATCH / ADVANCED
# ============================================

class BatchItem(BaseModel):
    text: str
    language: str = "English"
    emotion: str = "neutral"
    speed: float = 1.0

class BatchGenerateRequest(BaseModel):
    voiceId: str
    items: List[BatchItem]

class LoadModelRequest(BaseModel):
    model_id: str

class ConversationRequest(BaseModel):
    script: str
    voices: dict  # {speaker_label: voice_id}
    language: str = "English"
    gap: float = 0.3

class AudiobookRequest(BaseModel):
    text: str
    narratorVoiceId: str
    dialogueVoiceId: Optional[str] = None
    language: str = "English"
    title: str = "Audiobook"

class EmotionSegment(BaseModel):
    text: str
    emotion: str = "neutral"

class EmotionTimelineRequest(BaseModel):
    voiceId: str
    segments: List[EmotionSegment]
    language: str = "English"
    speed: float = 1.0

class CompareRequest(BaseModel):
    text: str
    voiceIdA: str
    voiceIdB: str
    language: str = "English"

class ConvertRequest(BaseModel):
    text: str
    voiceId: str
    language: str = "English"
    format: str = "wav"

class SrtRequest(BaseModel):
    text: str
    voiceId: str
    language: str = "English"


# ============================================
# STORIES (TIMELINE)
# ============================================

class StoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = ""

class StoryItemCreate(BaseModel):
    generation_id: str
    position_ms: int = 0
    track: int = 0

class StoryItemMove(BaseModel):
    position_ms: int
    track: Optional[int] = None

class StoryItemTrim(BaseModel):
    trim_start_ms: int = 0
    trim_end_ms: int = 0

class StoryItemResponse(BaseModel):
    id: str
    story_id: str
    generation_id: str
    position_ms: int
    track: int
    trim_start_ms: int
    trim_end_ms: int
    created_at: datetime
    generation: Optional[GenerationResponse] = None

    class Config:
        from_attributes = True

class StoryResponse(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime
    updated_at: datetime
    items: List[StoryItemResponse] = []

    class Config:
        from_attributes = True
