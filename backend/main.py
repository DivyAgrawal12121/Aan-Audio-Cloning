"""
VoxForge - FastAPI Backend
============================
Main server exposing REST API endpoints for:
  - Voice cloning (upload audio → extract embedding → save)
  - Voice design (text description → embedding → save)
  - TTS generation (text + voice + settings → audio)
  - Voice management (list, delete, preview)

Run with:
  uvicorn main:app --reload --port 8000
"""

import json
import logging
import os

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel
from typing import Optional

from tts_engine import get_engine
from voice_store import (
    save_voice,
    get_all_voices,
    get_voice,
    get_voice_embedding_path,
    get_voice_sample_path,
    delete_voice as store_delete_voice,
)

# ---- Logging ----
log_file_path = os.path.join(os.path.dirname(__file__), "data", "voxforge.log")
os.makedirs(os.path.dirname(log_file_path), exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(log_file_path, encoding="utf-8")
    ]
)
logger = logging.getLogger("voxforge")

# ---- App ----
app = FastAPI(
    title="VoxForge API",
    description="AI Voice Cloning & TTS powered by Qwen3-TTS 1.7B",
    version="1.0.0",
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Models ----
class GenerateRequest(BaseModel):
    text: str
    voiceId: str
    language: str = "English"
    emotion: str = "neutral"
    speed: float = 1.0
    pitch: float = 1.0
    duration: Optional[float] = None
    style: Optional[str] = None


class DesignVoiceRequest(BaseModel):
    description: str
    name: str
    language: str = "English"


class PreviewRequest(BaseModel):
    voiceId: str
    text: str = "Hello, this is a preview of my voice."


# ---- Health ----
@app.get("/")
async def root():
    return {"status": "ok", "service": "VoxForge API", "model": "Qwen3-TTS-1.7B-INT8"}


@app.get("/health")
async def health():
    engine = get_engine()
    return {
        "status": "ok",
        "model_loaded": engine._loaded,
        "device": engine.device,
    }


# ==============================
# Server Logs
# ==============================
@app.get("/api/logs")
async def get_logs():
    """Retrieve the recent backend logs."""
    try:
        with open(log_file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            return {"logs": "".join(lines[-1000:])}
    except Exception as e:
        return {"logs": f"Failed to read logs: {e}"}

# ==============================
# Voice Cloning
# ==============================
@app.post("/api/clone")
async def clone_voice(
    audio: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(""),
    language: str = Form("English"),
    tags: str = Form("[]"),
):
    """Clone a voice from an uploaded audio sample."""
    logger.info(f"Cloning voice: {name} (file: {audio.filename})")

    # Read audio bytes
    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(400, "Empty audio file")

    # Clone voice using the new qwen_tts engine
    engine = get_engine()
    clone_result = engine.clone_voice(audio_bytes)
    embedding_bytes = clone_result["prompt_bytes"]

    # Parse tags
    try:
        tag_list = json.loads(tags) if tags else []
    except json.JSONDecodeError:
        tag_list = []

    # Save voice
    voice = save_voice(
        name=name,
        description=description,
        language=language,
        tags=tag_list,
        embedding_data=embedding_bytes,
        audio_sample=audio_bytes,
    )

    logger.info(f"Voice cloned successfully: {voice['id']}")
    return voice


# ==============================
# Voice Design
# ==============================
@app.post("/api/design-voice")
async def design_voice(req: DesignVoiceRequest):
    """Create a new voice from a text description."""
    logger.info(f"Designing voice: {req.name}")

    engine = get_engine()

    # Generate design audio and use it to create a clone prompt
    design_audio = engine.design_voice(
        description=req.description,
        text="Hello, this is a preview of the designed voice.",
        language=req.language,
    )

    # Clone from the designed audio to get a reusable prompt
    clone_result = engine.clone_voice(design_audio)
    embedding_bytes = clone_result["prompt_bytes"]

    voice = save_voice(
        name=req.name,
        description=req.description,
        language=req.language,
        tags=["designed"],
        embedding_data=embedding_bytes,
        audio_sample=design_audio,
    )

    logger.info(f"Voice designed successfully: {voice['id']}")
    return voice


# ==============================
# TTS Generation
# ==============================
@app.post("/api/generate")
async def generate_speech(req: GenerateRequest):
    """Generate speech audio from text using a saved voice."""
    logger.info(f"Generating speech: voice={req.voiceId}, lang={req.language}, emotion={req.emotion}")

    # Validate voice exists
    voice = get_voice(req.voiceId)
    if not voice:
        raise HTTPException(404, f"Voice not found: {req.voiceId}")

    embedding_path = get_voice_embedding_path(req.voiceId)
    if not embedding_path:
        raise HTTPException(404, f"Voice embedding not found: {req.voiceId}")

    # Generate audio
    engine = get_engine()
    audio_bytes = engine.generate_speech(
        text=req.text,
        embedding_path=embedding_path,
        language=req.language,
        emotion=req.emotion,
        speed=req.speed,
        pitch=req.pitch,
        duration=req.duration,
        style=req.style,
    )

    logger.info(f"Speech generated: {len(audio_bytes)} bytes")
    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={"Content-Disposition": "attachment; filename=output.wav"},
    )


# ==============================
# Voice Preview
# ==============================
@app.post("/api/preview")
async def preview_voice(req: PreviewRequest):
    """Generate a short preview of a voice."""
    voice = get_voice(req.voiceId)
    if not voice:
        raise HTTPException(404, f"Voice not found: {req.voiceId}")

    embedding_path = get_voice_embedding_path(req.voiceId)
    if not embedding_path:
        raise HTTPException(404, f"Voice embedding not found: {req.voiceId}")

    engine = get_engine()
    audio_bytes = engine.generate_speech(
        text=req.text,
        embedding_path=embedding_path,
        language=voice.get("language", "English"),
    )

    return Response(content=audio_bytes, media_type="audio/wav")


# ==============================
# Voice Management
# ==============================
@app.get("/api/voices")
async def list_voices():
    """List all saved voices."""
    return get_all_voices()


@app.get("/api/voices/{voice_id}")
async def get_voice_details(voice_id: str):
    """Get details of a specific voice."""
    voice = get_voice(voice_id)
    if not voice:
        raise HTTPException(404, f"Voice not found: {voice_id}")
    return voice


@app.delete("/api/voices/{voice_id}")
async def remove_voice(voice_id: str):
    """Delete a saved voice."""
    success = store_delete_voice(voice_id)
    if not success:
        raise HTTPException(404, f"Voice not found: {voice_id}")
    logger.info(f"Voice deleted: {voice_id}")
    return {"status": "deleted", "id": voice_id}


@app.get("/api/voices/{voice_id}/sample")
async def get_voice_sample(voice_id: str):
    """Get the original audio sample for a cloned voice."""
    sample_path = get_voice_sample_path(voice_id)
    if not sample_path:
        raise HTTPException(404, "No audio sample available for this voice")
    return FileResponse(sample_path, media_type="audio/wav")


# ---- Startup ----
@app.on_event("startup")
async def startup():
    logger.info("=" * 60)
    logger.info("  VoxForge API Server Starting")
    logger.info("  Model: Qwen3-TTS 1.7B INT8")
    logger.info("=" * 60)
    # Optionally pre-load the model (uncomment to load eagerly)
    # get_engine()._ensure_loaded()
