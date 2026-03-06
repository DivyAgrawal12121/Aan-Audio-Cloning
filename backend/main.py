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
import gc

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse, StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional

from engine_manager import get_manager
from voice_store import (
    save_voice,
    get_all_voices,
    get_voice,
    get_voice_embedding_path,
    get_voice_sample_path,
    delete_voice as store_delete_voice,
)
from utils.audio_utils import master_audio, sanitize_reference_audio

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
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler (OOM Protection)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = str(exc)
    if "out of memory" in error_msg.lower():
        logger.error("CUDA Out of Memory caught. Cleaning up VRAM...")
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()
        except:
            pass
        return JSONResponse(
            status_code=503, 
            content={"detail": "GPU out of memory. The server has freed VRAM. Try generating a shorter audio clip or select a smaller model."}
        )
    
    logger.error(f"Unhandled exception: {error_msg}", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": f"Internal Server Error: {error_msg}"})


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
    manager = get_manager()
    engine = manager.get_current_engine()
    return {
        "status": "ok",
        "active_model": manager.active_model_id,
        "device": engine.device if engine else None,
    }

# ==============================
# Model Management
# ==============================
@app.get("/api/models")
async def list_models():
    """List all available AI audio models and their current load status."""
    manager = get_manager()
    models = manager.get_available_models()
    return {
        "active": manager.active_model_id,
        "models": models
    }

class LoadModelRequest(BaseModel):
    model_id: str

@app.post("/api/models/load")
async def load_model_endpoint(req: LoadModelRequest):
    """Dynamically switch and load an engine into VRAM."""
    manager = get_manager()
    try:
        engine = manager.load_model(req.model_id)
        return {"status": "success", "model": req.model_id, "device": engine.device}
    except Exception as e:
        logger.error(f"Failed to load model {req.model_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/models/load-stream")
async def load_model_stream(model_id: str):
    """
    SSE endpoint that streams real-time progress while loading a model.
    Usage: GET /api/models/load-stream?model_id=qwen-1.7b
    """
    manager = get_manager()

    def event_generator():
        for progress in manager.load_model_with_progress(model_id):
            yield progress.to_sse()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


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
        
    # Remove background noise to improve clone quality
    audio_bytes = sanitize_reference_audio(audio_bytes)

    # Clone voice using the active manager engine
    manager = get_manager()
    engine = manager.get_current_engine()
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

    manager = get_manager()
    engine = manager.get_current_engine()

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

    # Optional parameters for advanced models
    kwargs = {}
    if hasattr(req, "temperature") and req.temperature is not None:
        kwargs["temperature"] = req.temperature
    if hasattr(req, "repetition_penalty") and req.repetition_penalty is not None:
        kwargs["repetition_penalty"] = req.repetition_penalty

    manager = get_manager()
    engine = manager.get_current_engine()
    audio_bytes = engine.generate_speech(
        text=req.text,
        embedding_path=embedding_path,
        language=req.language,
        emotion=req.emotion,
        speed=req.speed,
        pitch=req.pitch,
        duration=req.duration,
        style=req.style,
        **kwargs
    )
    
    # Process audio through the mastering chain
    audio_bytes = master_audio(audio_bytes)

    logger.info(f"Speech generated and mastered: {len(audio_bytes)} bytes")
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

    manager = get_manager()
    engine = manager.get_current_engine()
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


# ==============================
# Foley / Sound Effects
# ==============================
class FoleyRequest(BaseModel):
    description: str

@app.post("/api/foley")
async def generate_foley(req: FoleyRequest):
    """Generate sound effects from a text description (requires Bark)."""
    logger.info(f"Foley generation: {req.description[:60]}")
    manager = get_manager()
    engine = manager.get_current_engine()
    try:
        audio_bytes = engine.generate_foley(req.description)
        audio_bytes = master_audio(audio_bytes) # Add mastering
        return Response(content=audio_bytes, media_type="audio/wav",
                        headers={"Content-Disposition": "attachment; filename=foley.wav"})
    except NotImplementedError:
        raise HTTPException(400, f"The currently loaded model ({manager.active_model_id}) does not support foley generation. Switch to Bark.")


# ==============================
# Cross-Lingual Voice Dubbing
# ==============================
class DubbingRequest(BaseModel):
    text: str
    voiceId: str
    sourceLang: str = "English"
    targetLang: str = "Hindi"

@app.post("/api/dubbing")
async def cross_lingual_dub(req: DubbingRequest):
    """Clone voice and generate speech in a different language."""
    logger.info(f"Dubbing: {req.voiceId} from {req.sourceLang} to {req.targetLang}")
    voice = get_voice(req.voiceId)
    if not voice:
        raise HTTPException(404, f"Voice not found: {req.voiceId}")

    sample_path = get_voice_sample_path(req.voiceId)
    if not sample_path:
        raise HTTPException(404, "No audio sample available for dubbing")

    with open(sample_path, "rb") as f:
        audio_bytes = f.read()

    manager = get_manager()
    engine = manager.get_current_engine()
    try:
        dubbed_audio = engine.cross_lingual_clone(
            audio_bytes=audio_bytes,
            text=req.text,
            source_lang=req.sourceLang,
            target_lang=req.targetLang,
        )
        dubbed_audio = master_audio(dubbed_audio) # Add mastering
        return Response(content=dubbed_audio, media_type="audio/wav",
                        headers={"Content-Disposition": "attachment; filename=dubbed.wav"})
    except NotImplementedError:
        raise HTTPException(400, f"The currently loaded model ({manager.active_model_id}) does not support cross-lingual dubbing. Switch to CosyVoice or XTTS v2.")


# ==============================
# Podcast Auto-Generation
# ==============================
class PodcastRequest(BaseModel):
    script: str
    voiceIdA: str
    voiceIdB: str

@app.post("/api/podcast")
async def generate_podcast(req: PodcastRequest):
    """Generate a multi-speaker podcast from a script."""
    logger.info("Generating podcast...")
    voice_a_path = get_voice_embedding_path(req.voiceIdA)
    voice_b_path = get_voice_embedding_path(req.voiceIdB)
    if not voice_a_path or not voice_b_path:
        raise HTTPException(404, "One or both voice embeddings not found")

    manager = get_manager()
    engine = manager.get_current_engine()
    try:
        audio_bytes = engine.generate_podcast(
            script=req.script,
            voice_a_path=voice_a_path,
            voice_b_path=voice_b_path,
        )
        audio_bytes = master_audio(audio_bytes) # Add mastering
        return Response(content=audio_bytes, media_type="audio/wav",
                        headers={"Content-Disposition": "attachment; filename=podcast.wav"})
    except NotImplementedError:
        raise HTTPException(400, f"The currently loaded model ({manager.active_model_id}) does not support podcast generation. Switch to F5-TTS or Fish Speech.")


# ==============================
# Audio In-Painting
# ==============================
@app.post("/api/inpaint")
async def audio_inpaint(
    audio: UploadFile = File(...),
    original_text: str = Form(...),
    corrected_text: str = Form(...),
):
    """Replace a segment of audio with corrected version, keeping same voice."""
    logger.info(f"Audio inpainting: '{original_text}' -> '{corrected_text}'")
    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(400, "Empty audio file")

    manager = get_manager()
    engine = manager.get_current_engine()
    try:
        inpainted = engine.audio_inpaint(
            audio_bytes=audio_bytes,
            original_text=original_text,
            corrected_text=corrected_text,
        )
        return Response(content=inpainted, media_type="audio/wav",
                        headers={"Content-Disposition": "attachment; filename=inpainted.wav"})
    except NotImplementedError:
        raise HTTPException(400, f"The currently loaded model ({manager.active_model_id}) does not support audio in-painting.")


# ---- Startup ----
@app.on_event("startup")
async def startup():
    logger.info("=" * 60)
    logger.info("  VoxForge API Server Starting")
    logger.info("  Multi-Model Architecture v2.0")
    logger.info("=" * 60)
    
    # Enable automatic CuDNN optimizations for generation algorithms
    try:
        import torch
        if torch.cuda.is_available():
            torch.backends.cudnn.benchmark = True
            logger.info("Enabled CuDNN benchmarks for optimized performance.")
    except ImportError:
        pass
