"""
Resound Studio - FastAPI Backend
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
import uuid
import time
import threading
import io
from contextlib import asynccontextmanager

import numpy as np
import soundfile as sf
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse, StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

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
from utils.text_chunker import chunk_text
from utils.audio_cache import get_cached, put_cached, clear_cache as clear_audio_cache, get_cache_stats
from utils.features import (
    parse_multi_speaker_script, generate_multi_speaker_audio,
    split_into_chapters, detect_dialogue,
    export_voice, import_voice,
    generate_srt, estimate_segment_timing,
    mix_audio_with_music,
    parse_emotion_timeline,
    convert_audio_format,
)
from utils.api_key_middleware import ApiKeyMiddleware, API_KEY

# ---- Logging ----
log_file_path = os.path.join(os.path.dirname(__file__), "data", "resound-studio.log")
os.makedirs(os.path.dirname(log_file_path), exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(log_file_path, encoding="utf-8")
    ]
)
logger = logging.getLogger("resound-studio")

# ---- Lifespan ----
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("  Resound Studio API Server Starting")
    logger.info("  Multi-Model Architecture v2.0")
    logger.info("=" * 60)
    
    # Enable automatic CuDNN optimizations for generation algorithms
    try:
        import torch
        if torch.cuda.is_available():
            torch.backends.cudnn.benchmark = True
            logger.info("Enabled CuDNN benchmarks for optimized performance.")

            # Check for flash-attn (#3)
            try:
                import flash_attn
                logger.info(f"flash-attn v{flash_attn.__version__} detected ✓ (2-4x faster attention)")
            except ImportError:
                logger.warning(
                    "flash-attn is NOT installed. Install it for 2-4x faster Qwen inference: "
                    "pip install flash-attn --no-build-isolation"
                )
    except ImportError:
        pass
        
    yield
    logger.info("Resound Studio API Server Shutting Down")

# ---- App ----
app = FastAPI(
    title="Resound Studio API",
    description="AI Voice Cloning & TTS powered by Qwen3-TTS 1.7B",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Key middleware (only active when RESOUND_API_KEY env var is set)
if API_KEY:
    app.add_middleware(ApiKeyMiddleware)
    logger.info(f"API Key authentication ENABLED (rate limit: {os.environ.get('RESOUND_RATE_LIMIT', '60')}/min)")
else:
    logger.info("API Key authentication DISABLED (set RESOUND_API_KEY to enable)")



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
    return {"status": "ok", "service": "Resound Studio API", "model": "Qwen3-TTS-1.7B-INT8"}


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

@app.post("/api/models/unload")
async def unload_model_endpoint(req: LoadModelRequest):
    """Explicitly unload a model and free VRAM."""
    manager = get_manager()
    try:
        success = manager.unload_model(req.model_id)
        if success:
            return {"status": "success", "message": f"Model {req.model_id} unloaded."}
        else:
            return {"status": "error", "message": f"Model {req.model_id} was not loaded."}
    except Exception as e:
        logger.error(f"Failed to unload model {req.model_id}: {e}", exc_info=True)
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
        engine_id=manager.active_model_id or "unknown",
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
        engine_id=manager.active_model_id or "unknown",
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

    # Warn if voice was cloned with a different engine
    manager = get_manager()
    cloned_with = voice.get("clonedWithEngine", "unknown")
    if cloned_with != "unknown" and cloned_with != manager.active_model_id:
        logger.warning(
            f"Voice '{req.voiceId}' was cloned with '{cloned_with}' but current engine is '{manager.active_model_id}'. "
            f"Results may be degraded. For best quality, switch to the '{cloned_with}' model."
        )

    # ── Cache check ──
    cache_settings = {
        "language": req.language, "emotion": req.emotion,
        "speed": req.speed, "pitch": req.pitch,
        "style": req.style, "engine": manager.active_model_id,
    }
    cached = get_cached(req.text, req.voiceId, **cache_settings)
    if cached:
        logger.info("Returning cached audio (cache HIT)")
        return Response(
            content=cached, media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=output.wav", "X-Cache": "HIT"},
        )

    engine = manager.get_current_engine()

    # ── Text chunking for long inputs ──
    chunks = chunk_text(req.text)

    if len(chunks) <= 1:
        # Short text — generate normally
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
    else:
        # Long text — generate each chunk and concatenate
        logger.info(f"Chunked generation: {len(chunks)} chunks")
        audio_segments = []
        for i, chunk_text_str in enumerate(chunks):
            logger.info(f"  Generating chunk {i+1}/{len(chunks)}: {chunk_text_str[:50]}...")
            chunk_audio = engine.generate_speech(
                text=chunk_text_str,
                embedding_path=embedding_path,
                language=req.language,
                emotion=req.emotion,
                speed=req.speed,
                pitch=req.pitch,
                style=req.style,
                **kwargs
            )
            # Decode WAV bytes to numpy array for concatenation
            chunk_data, chunk_sr = sf.read(io.BytesIO(chunk_audio))
            audio_segments.append(chunk_data)

        # Concatenate all segments with a small silence gap
        silence = np.zeros(int(chunk_sr * 0.15))  # 150ms gap between chunks
        combined = []
        for i, seg in enumerate(audio_segments):
            combined.append(seg)
            if i < len(audio_segments) - 1:
                combined.append(silence)
        combined_audio = np.concatenate(combined)

        buffer = io.BytesIO()
        sf.write(buffer, combined_audio, chunk_sr, format="WAV")
        buffer.seek(0)
        audio_bytes = buffer.getvalue()

    # Process audio through the mastering chain
    audio_bytes = master_audio(audio_bytes)

    # ── Cache store ──
    put_cached(audio_bytes, req.text, req.voiceId, **cache_settings)

    logger.info(f"Speech generated and mastered: {len(audio_bytes)} bytes")
    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={"Content-Disposition": "attachment; filename=output.wav", "X-Cache": "MISS"},
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

    caps = engine.get_capabilities()
    if not caps.get("foley", False):
        raise HTTPException(
            400,
            f"The currently loaded model ({manager.active_model_id}) does not support foley/sound-effect generation. Switch to Bark."
        )

    audio_bytes = engine.generate_foley(req.description)
    audio_bytes = master_audio(audio_bytes)
    return Response(content=audio_bytes, media_type="audio/wav",
                    headers={"Content-Disposition": "attachment; filename=foley.wav"})


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

    manager = get_manager()
    engine = manager.get_current_engine()

    caps = engine.get_capabilities()
    if not caps.get("cross_lingual", False):
        raise HTTPException(
            400,
            f"The currently loaded model ({manager.active_model_id}) does not support cross-lingual dubbing. Switch to CosyVoice or XTTS v2."
        )

    voice = get_voice(req.voiceId)
    if not voice:
        raise HTTPException(404, f"Voice not found: {req.voiceId}")

    sample_path = get_voice_sample_path(req.voiceId)
    if not sample_path:
        raise HTTPException(404, "No audio sample available for dubbing")

    with open(sample_path, "rb") as f:
        audio_bytes = f.read()

    dubbed_audio = engine.cross_lingual_clone(
        audio_bytes=audio_bytes,
        text=req.text,
        source_lang=req.sourceLang,
        target_lang=req.targetLang,
    )
    dubbed_audio = master_audio(dubbed_audio)
    return Response(content=dubbed_audio, media_type="audio/wav",
                    headers={"Content-Disposition": "attachment; filename=dubbed.wav"})


# ==============================
# Podcast Auto-Generation
# ==============================
class PodcastRequest(BaseModel):
    script: str
    voiceIdA: str
    voiceIdB: str
    language: str = "English"

@app.post("/api/podcast")
async def generate_podcast(req: PodcastRequest):
    """Generate a multi-speaker podcast from a script. Works with ALL engines."""
    logger.info("Generating podcast...")

    # Validate both voices
    emb_a = get_voice_embedding_path(req.voiceIdA)
    emb_b = get_voice_embedding_path(req.voiceIdB)
    if not emb_a:
        raise HTTPException(404, f"Speaker A voice not found: {req.voiceIdA}")
    if not emb_b:
        raise HTTPException(404, f"Speaker B voice not found: {req.voiceIdB}")

    # Parse script into speaker turns
    script_lines = parse_multi_speaker_script(req.script)
    if not script_lines:
        raise HTTPException(400, "Could not parse any speaker lines. Use 'A:' and 'B:' prefixes.")

    # Map speaker labels to embeddings
    voice_map = {"A": emb_a, "B": emb_b}

    manager = get_manager()
    engine = manager.get_current_engine()

    # Generate each line using the engine's generate_speech (works with ALL engines)
    segments = []
    sample_rate = None

    for i, line in enumerate(script_lines):
        speaker = line["speaker"].upper()
        text = line["text"]

        # Map speaker to embedding (default to A for unknown speakers)
        embedding = voice_map.get(speaker, emb_a)

        logger.info(f"  Podcast [{speaker}] ({i+1}/{len(script_lines)}): {text[:50]}...")

        try:
            audio_bytes = engine.generate_speech(
                text=text,
                embedding_path=embedding,
                language=req.language,
            )
            data, sr = sf.read(io.BytesIO(audio_bytes))
            if sample_rate is None:
                sample_rate = sr
            segments.append(data)
        except Exception as e:
            logger.error(f"  Failed to generate line {i+1}: {e}")
            # Add silence as placeholder for failed line
            if sample_rate:
                segments.append(np.zeros(int(sample_rate * 0.5)))
            continue

    if not segments or sample_rate is None:
        raise HTTPException(500, "Failed to generate any audio segments")

    # Concatenate with natural pauses between speaker turns
    pause = np.zeros(int(sample_rate * 0.4), dtype=np.float32)
    combined = []
    for i, seg in enumerate(segments):
        combined.append(seg.astype(np.float32))
        if i < len(segments) - 1:
            combined.append(pause)

    result = np.concatenate(combined)

    # Normalize
    if np.abs(result).max() > 0:
        result = result / np.abs(result).max() * 0.95

    buffer = io.BytesIO()
    sf.write(buffer, result, sample_rate, format="WAV")
    buffer.seek(0)
    audio_bytes = master_audio(buffer.getvalue())

    logger.info(f"Podcast generated: {len(script_lines)} lines, {len(audio_bytes)} bytes")
    return Response(content=audio_bytes, media_type="audio/wav",
                    headers={"Content-Disposition": "attachment; filename=podcast.wav"})


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

    manager = get_manager()
    engine = manager.get_current_engine()

    # No engine currently supports inpainting — give a clear error
    raise HTTPException(
        400,
        f"The currently loaded model ({manager.active_model_id}) does not support audio in-painting. This feature is planned for a future update."
    )


# ==============================
# Streaming Generation (#2)
# ==============================
class StreamGenerateRequest(BaseModel):
    text: str
    voiceId: str
    language: str = "English"
    emotion: str = "neutral"
    speed: float = 1.0
    pitch: float = 1.0
    style: Optional[str] = None


@app.post("/api/generate/stream")
async def generate_speech_stream(req: StreamGenerateRequest):
    """Stream audio chunks as they're generated via SSE (Server-Sent Events)."""
    voice = get_voice(req.voiceId)
    if not voice:
        raise HTTPException(404, f"Voice not found: {req.voiceId}")

    embedding_path = get_voice_embedding_path(req.voiceId)
    if not embedding_path:
        raise HTTPException(404, f"Voice embedding not found: {req.voiceId}")

    import base64

    def stream_chunks():
        manager = get_manager()
        engine = manager.get_current_engine()
        chunks = chunk_text(req.text)

        yield f"data: {json.dumps({'type': 'start', 'total_chunks': len(chunks)})}\n\n"

        for i, chunk_str in enumerate(chunks):
            try:
                chunk_audio = engine.generate_speech(
                    text=chunk_str,
                    embedding_path=embedding_path,
                    language=req.language,
                    emotion=req.emotion,
                    speed=req.speed,
                    pitch=req.pitch,
                    style=req.style,
                )
                chunk_audio = master_audio(chunk_audio)

                yield f"data: {json.dumps({'type': 'chunk', 'index': i, 'total': len(chunks), 'audio_base64': base64.b64encode(chunk_audio).decode(), 'size_bytes': len(chunk_audio)})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'index': i, 'error': str(e)})}\n\n"

        yield f"data: {json.dumps({'type': 'done', 'total_chunks': len(chunks)})}\n\n"

    return StreamingResponse(stream_chunks(), media_type="text/event-stream")


# ==============================
# Async Job System (#1)
# ==============================
_jobs: Dict[str, Dict[str, Any]] = {}
_jobs_lock = threading.Lock()


class AsyncGenerateRequest(BaseModel):
    text: str
    voiceId: str
    language: str = "English"
    emotion: str = "neutral"
    speed: float = 1.0
    pitch: float = 1.0
    style: Optional[str] = None


def _run_async_job(job_id: str, req_data: dict):
    """Background thread that runs TTS generation and updates job status."""
    try:
        with _jobs_lock:
            _jobs[job_id]["status"] = "processing"
            _jobs[job_id]["started_at"] = time.time()

        embedding_path = get_voice_embedding_path(req_data["voiceId"])
        if not embedding_path:
            raise RuntimeError(f"Voice embedding not found: {req_data['voiceId']}")

        manager = get_manager()
        engine = manager.get_current_engine()

        chunks = chunk_text(req_data["text"])
        if len(chunks) <= 1:
            audio_bytes = engine.generate_speech(
                text=req_data["text"],
                embedding_path=embedding_path,
                language=req_data.get("language", "English"),
                emotion=req_data.get("emotion", "neutral"),
                speed=req_data.get("speed", 1.0),
                pitch=req_data.get("pitch", 1.0),
                style=req_data.get("style"),
            )
        else:
            audio_segments = []
            for i, chunk_str in enumerate(chunks):
                with _jobs_lock:
                    _jobs[job_id]["progress"] = round((i / len(chunks)) * 100)
                    _jobs[job_id]["message"] = f"Generating chunk {i+1}/{len(chunks)}"
                chunk_audio = engine.generate_speech(
                    text=chunk_str,
                    embedding_path=embedding_path,
                    language=req_data.get("language", "English"),
                    emotion=req_data.get("emotion", "neutral"),
                    speed=req_data.get("speed", 1.0),
                    pitch=req_data.get("pitch", 1.0),
                    style=req_data.get("style"),
                )
                chunk_data, chunk_sr = sf.read(io.BytesIO(chunk_audio))
                audio_segments.append(chunk_data)

            silence = np.zeros(int(chunk_sr * 0.15))
            combined = []
            for i, seg in enumerate(audio_segments):
                combined.append(seg)
                if i < len(audio_segments) - 1:
                    combined.append(silence)
            combined_audio = np.concatenate(combined)
            buf = io.BytesIO()
            sf.write(buf, combined_audio, chunk_sr, format="WAV")
            buf.seek(0)
            audio_bytes = buf.getvalue()

        audio_bytes = master_audio(audio_bytes)

        result_path = os.path.join(os.path.dirname(__file__), "data", "jobs", f"{job_id}.wav")
        os.makedirs(os.path.dirname(result_path), exist_ok=True)
        with open(result_path, "wb") as f:
            f.write(audio_bytes)

        with _jobs_lock:
            _jobs[job_id]["status"] = "completed"
            _jobs[job_id]["progress"] = 100
            _jobs[job_id]["message"] = "Done"
            _jobs[job_id]["result_size"] = len(audio_bytes)
            _jobs[job_id]["completed_at"] = time.time()
            _jobs[job_id]["duration"] = round(time.time() - _jobs[job_id]["started_at"], 2)

    except Exception as e:
        logger.error(f"Async job {job_id} failed: {e}", exc_info=True)
        with _jobs_lock:
            _jobs[job_id]["status"] = "failed"
            _jobs[job_id]["error"] = str(e)


@app.post("/api/generate/async")
async def generate_speech_async(req: AsyncGenerateRequest):
    """Submit a TTS job for async processing. Returns a job ID to poll."""
    voice = get_voice(req.voiceId)
    if not voice:
        raise HTTPException(404, f"Voice not found: {req.voiceId}")

    job_id = str(uuid.uuid4())
    req_data = req.model_dump()

    with _jobs_lock:
        _jobs[job_id] = {
            "id": job_id,
            "status": "queued",
            "progress": 0,
            "message": "Queued for processing",
            "created_at": time.time(),
            "voice_id": req.voiceId,
            "text_preview": req.text[:100],
        }

    thread = threading.Thread(target=_run_async_job, args=(job_id, req_data), daemon=True)
    thread.start()

    logger.info(f"Async job submitted: {job_id}")
    return {"jobId": job_id, "status": "queued"}


@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Poll for the status of an async generation job."""
    with _jobs_lock:
        job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, f"Job not found: {job_id}")
    return job


@app.get("/api/jobs/{job_id}/result")
async def get_job_result(job_id: str):
    """Download the result of a completed async job."""
    with _jobs_lock:
        job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, f"Job not found: {job_id}")
    if job["status"] != "completed":
        raise HTTPException(400, f"Job is not complete yet. Status: {job['status']}")

    result_path = os.path.join(os.path.dirname(__file__), "data", "jobs", f"{job_id}.wav")
    if not os.path.exists(result_path):
        raise HTTPException(404, "Job result file not found")
    return FileResponse(result_path, media_type="audio/wav",
                        headers={"Content-Disposition": f"attachment; filename={job_id}.wav"})


# ==============================
# Batch Generation (#7)
# ==============================
class BatchItem(BaseModel):
    text: str
    language: str = "English"
    emotion: str = "neutral"
    speed: float = 1.0


class BatchGenerateRequest(BaseModel):
    voiceId: str
    items: List[BatchItem]


@app.post("/api/generate/batch")
async def generate_batch(req: BatchGenerateRequest):
    """Generate multiple texts in a single request."""
    voice = get_voice(req.voiceId)
    if not voice:
        raise HTTPException(404, f"Voice not found: {req.voiceId}")

    embedding_path = get_voice_embedding_path(req.voiceId)
    if not embedding_path:
        raise HTTPException(404, f"Voice embedding not found: {req.voiceId}")

    if len(req.items) > 20:
        raise HTTPException(400, "Maximum 20 items per batch")

    manager = get_manager()
    engine = manager.get_current_engine()

    import base64
    results = []
    for i, item in enumerate(req.items):
        logger.info(f"Batch item {i+1}/{len(req.items)}: {item.text[:50]}...")
        try:
            audio_bytes = engine.generate_speech(
                text=item.text,
                embedding_path=embedding_path,
                language=item.language,
                emotion=item.emotion,
                speed=item.speed,
            )
            audio_bytes = master_audio(audio_bytes)
            results.append({
                "index": i,
                "status": "success",
                "size_bytes": len(audio_bytes),
                "audio_base64": base64.b64encode(audio_bytes).decode(),
            })
        except Exception as e:
            results.append({"index": i, "status": "failed", "error": str(e)})

    return {"voiceId": req.voiceId, "total": len(req.items), "results": results}


# ==============================
# Health Check (#9)
# ==============================
@app.get("/api/health")
async def health_check():
    """Basic API health check."""
    return {"status": "ok", "version": "2.0.0"}


@app.get("/api/health/engine")
async def engine_health_check():
    """Check if the loaded engine is healthy and can generate."""
    manager = get_manager()

    if not manager.active_model_id:
        return {"status": "no_model", "message": "No model is currently loaded.", "model_id": None}

    engine = manager.loaded_engines.get(manager.active_model_id)
    if not engine or not engine.is_loaded:
        return {
            "status": "not_loaded",
            "message": f"Model {manager.active_model_id} is registered but not loaded.",
            "model_id": manager.active_model_id,
        }

    model_info = manager.AVAILABLE_MODELS.get(manager.active_model_id, {})
    return {
        "status": "ready",
        "model_id": manager.active_model_id,
        "model_name": model_info.get("name", "Unknown"),
        "capabilities": engine.get_capabilities(),
        "features": model_info.get("features", []),
        "vram_estimate": model_info.get("vram_estimate", "Unknown"),
    }


# ==============================
# VRAM Monitoring (#10)
# ==============================
@app.get("/api/system/vram")
async def get_vram_info():
    """Get GPU memory usage information."""
    try:
        import torch
        if not torch.cuda.is_available():
            return {"gpu_available": False, "message": "No CUDA GPU detected. Running on CPU."}

        device_count = torch.cuda.device_count()
        gpus = []
        for i in range(device_count):
            props = torch.cuda.get_device_properties(i)
            allocated = torch.cuda.memory_allocated(i)
            total = props.total_mem
            gpus.append({
                "index": i,
                "name": props.name,
                "total_mb": round(total / (1024 * 1024)),
                "allocated_mb": round(allocated / (1024 * 1024)),
                "free_mb": round((total - allocated) / (1024 * 1024)),
                "usage_percent": round(allocated / total * 100, 1),
            })

        manager = get_manager()
        return {
            "gpu_available": True,
            "device_count": device_count,
            "gpus": gpus,
            "active_model": manager.active_model_id,
            "loaded_models": list(manager.loaded_engines.keys()),
        }
    except ImportError:
        return {"gpu_available": False, "message": "PyTorch not installed."}


# ==============================
# Cache Management (#5)
# ==============================
@app.get("/api/cache/stats")
async def cache_stats():
    """Get audio cache statistics."""
    return get_cache_stats()


@app.delete("/api/cache")
async def api_clear_cache():
    """Clear all cached audio."""
    count = clear_audio_cache()
    return {"status": "cleared", "files_removed": count}


# ==============================
# Graceful Error Handler (#8)
# ==============================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all that returns friendly error messages instead of generic 500s."""
    error_msg = str(exc)

    if "out of memory" in error_msg.lower() or "OutOfMemoryError" in error_msg:
        logger.error("CUDA Out of Memory caught. Cleaning up VRAM...")
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()
        except:
            pass
        return JSONResponse(status_code=507, content={
            "detail": "GPU out of memory. Try a smaller model, shorter text, or restart the API.",
            "error": "GPU memory full",
            "message": "Not enough GPU memory. Try a smaller model, shorter text, or restart the API.",
            "code": "OOM",
        })
    elif "failed to load" in error_msg.lower():
        return JSONResponse(status_code=503, content={
            "detail": f"Failed to load the AI model: {error_msg}",
            "error": "Model load failure",
            "message": f"Failed to load the AI model: {error_msg}",
            "code": "MODEL_LOAD_FAILED",
        })
    elif "Reference audio not found" in error_msg:
        return JSONResponse(status_code=404, content={
            "detail": f"{error_msg}. Try re-cloning the voice.",
            "error": "Missing reference audio",
            "message": f"{error_msg}. Try re-cloning the voice.",
            "code": "REF_AUDIO_MISSING",
        })
    else:
        logger.error(f"Unhandled error: {exc}", exc_info=True)
        return JSONResponse(status_code=500, content={
            "detail": f"An unexpected error occurred: {error_msg}",
            "error": "Internal server error",
            "message": f"An unexpected error occurred: {error_msg}",
            "code": "INTERNAL",
        })


# ================================================================
# PART 3: NEW FEATURES
# ================================================================


# ==============================
# #3 — Multi-Speaker Conversation
# ==============================
class ConversationRequest(BaseModel):
    script: str
    voices: Dict[str, str]  # {"A": "voice-id-1", "B": "voice-id-2", "C": "voice-id-3"}
    language: str = "English"
    gap: float = 0.3  # seconds between speakers


@app.post("/api/conversation")
async def generate_conversation(req: ConversationRequest):
    """Generate a multi-speaker conversation from a labeled script."""
    logger.info(f"Multi-speaker conversation: {len(req.voices)} speakers")

    # Validate all voices exist and build embedding map
    voice_map = {}
    for label, voice_id in req.voices.items():
        embedding = get_voice_embedding_path(voice_id)
        if not embedding:
            raise HTTPException(404, f"Voice not found for speaker '{label}': {voice_id}")
        voice_map[label] = embedding

    script_lines = parse_multi_speaker_script(req.script)
    if not script_lines:
        raise HTTPException(400, "Could not parse any speaker lines from the script")

    # Check that all speakers in script have voices assigned
    speakers_in_script = set(line["speaker"] for line in script_lines)
    missing = speakers_in_script - set(req.voices.keys())
    if missing:
        raise HTTPException(400, f"No voice assigned for speaker(s): {', '.join(missing)}")

    manager = get_manager()
    engine = manager.get_current_engine()

    audio_bytes = generate_multi_speaker_audio(
        script_lines=script_lines,
        voice_map=voice_map,
        engine=engine,
        default_language=req.language,
        gap_seconds=req.gap,
    )
    audio_bytes = master_audio(audio_bytes)

    return Response(content=audio_bytes, media_type="audio/wav",
                    headers={"Content-Disposition": "attachment; filename=conversation.wav"})


# ==============================
# #4 — Audiobook Generator
# ==============================
class AudiobookRequest(BaseModel):
    text: str
    narratorVoiceId: str
    dialogueVoiceId: Optional[str] = None  # optional different voice for dialogue
    language: str = "English"
    title: str = "Audiobook"


@app.post("/api/audiobook")
async def generate_audiobook(req: AudiobookRequest):
    """Generate a full audiobook from text with chapter detection and dialogue voices."""
    logger.info(f"Audiobook generation: '{req.title}'")

    narrator_embedding = get_voice_embedding_path(req.narratorVoiceId)
    if not narrator_embedding:
        raise HTTPException(404, f"Narrator voice not found: {req.narratorVoiceId}")

    dialogue_embedding = narrator_embedding
    if req.dialogueVoiceId:
        dialogue_embedding = get_voice_embedding_path(req.dialogueVoiceId) or narrator_embedding

    manager = get_manager()
    engine = manager.get_current_engine()

    chapters = split_into_chapters(req.text)
    logger.info(f"Detected {len(chapters)} chapters")

    all_segments = []
    sample_rate = None
    chapter_markers = []

    for ch_idx, chapter in enumerate(chapters):
        logger.info(f"  Chapter {ch_idx+1}/{len(chapters)}: {chapter['title']}")
        chapter_start_samples = sum(len(s) for s in all_segments)

        # Detect dialogue within this chapter
        parts = detect_dialogue(chapter["content"])

        for part in parts:
            emb = dialogue_embedding if part["type"] == "dialogue" else narrator_embedding
            audio_bytes = engine.generate_speech(
                text=part["text"],
                embedding_path=emb,
                language=req.language,
            )
            data, sr = sf.read(io.BytesIO(audio_bytes))
            if sample_rate is None:
                sample_rate = sr
            all_segments.append(data)

            # Add small gap between parts
            all_segments.append(np.zeros(int(sr * 0.2)))

        # Add longer gap between chapters
        all_segments.append(np.zeros(int(sample_rate * 1.0)))

        chapter_markers.append({
            "chapter": ch_idx + 1,
            "title": chapter["title"],
            "start_sample": chapter_start_samples,
        })

    # Concatenate
    combined = np.concatenate(all_segments)
    buffer = io.BytesIO()
    sf.write(buffer, combined, sample_rate, format="WAV")
    buffer.seek(0)
    audio_bytes = master_audio(buffer.getvalue())

    logger.info(f"Audiobook generated: {len(audio_bytes)} bytes, {len(chapters)} chapters")
    return Response(content=audio_bytes, media_type="audio/wav",
                    headers={"Content-Disposition": f"attachment; filename={req.title}.wav"})


# ==============================
# #5 — Voice Library (Export/Import)
# ==============================
VOICES_DIR = os.path.join(os.path.dirname(__file__), "data", "voices")


@app.get("/api/voices/{voice_id}/export")
async def export_voice_endpoint(voice_id: str):
    """Export a voice as a downloadable .resound file."""
    voice = get_voice(voice_id)
    if not voice:
        raise HTTPException(404, f"Voice not found: {voice_id}")

    try:
        resound_bytes = export_voice(voice_id, VOICES_DIR)
        return Response(
            content=resound_bytes,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={voice_id}.resound"},
        )
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@app.post("/api/voices/import")
async def import_voice_endpoint(file: UploadFile = File(...)):
    """Import a .resound file to add a voice."""
    if not file.filename.endswith(".resound"):
        raise HTTPException(400, "File must have .resound extension")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(400, "Empty file")

    try:
        meta = import_voice(file_bytes, VOICES_DIR)
        logger.info(f"Voice imported: {meta['id']} (name: {meta.get('name', 'unknown')})")
        return meta
    except ValueError as e:
        raise HTTPException(400, str(e))


# ==============================
# #6 — Subtitle/SRT Generator
# ==============================
class SrtRequest(BaseModel):
    text: str
    voiceId: str
    language: str = "English"


@app.post("/api/generate/srt")
async def generate_with_srt(req: SrtRequest):
    """Generate audio AND matching SRT subtitle file."""
    voice = get_voice(req.voiceId)
    if not voice:
        raise HTTPException(404, f"Voice not found: {req.voiceId}")

    embedding_path = get_voice_embedding_path(req.voiceId)
    if not embedding_path:
        raise HTTPException(404, f"Voice embedding not found: {req.voiceId}")

    manager = get_manager()
    engine = manager.get_current_engine()

    # Generate audio
    audio_bytes = engine.generate_speech(
        text=req.text, embedding_path=embedding_path, language=req.language,
    )
    audio_bytes = master_audio(audio_bytes)

    # Calculate duration
    audio_data, sr = sf.read(io.BytesIO(audio_bytes))
    total_duration = len(audio_data) / sr

    # Split text into chunks for subtitle segments
    from utils.text_chunker import split_into_sentences
    sentences = split_into_sentences(req.text)
    segments = estimate_segment_timing(sentences, total_duration)
    srt_content = generate_srt(segments)

    import base64
    return {
        "audio_base64": base64.b64encode(audio_bytes).decode(),
        "audio_size": len(audio_bytes),
        "duration_seconds": round(total_duration, 2),
        "srt": srt_content,
        "segments": segments,
    }


# ==============================
# #7 — Background Music Mixing
# ==============================
@app.post("/api/mix-music")
async def mix_music(
    voice_audio: UploadFile = File(...),
    music_audio: UploadFile = File(...),
    music_volume: float = Form(0.15),
    fade_in: float = Form(1.0),
    fade_out: float = Form(2.0),
):
    """Mix background music with voice audio."""
    voice_bytes = await voice_audio.read()
    music_bytes = await music_audio.read()

    if not voice_bytes or not music_bytes:
        raise HTTPException(400, "Both voice and music audio files are required")

    mixed = mix_audio_with_music(
        voice_bytes=voice_bytes,
        music_bytes=music_bytes,
        music_volume=music_volume,
        fade_in_seconds=fade_in,
        fade_out_seconds=fade_out,
    )

    return Response(content=mixed, media_type="audio/wav",
                    headers={"Content-Disposition": "attachment; filename=mixed.wav"})


# ==============================
# #8 — Emotion Timeline
# ==============================
class EmotionSegment(BaseModel):
    text: str
    emotion: str = "neutral"


class EmotionTimelineRequest(BaseModel):
    voiceId: str
    segments: List[EmotionSegment]
    language: str = "English"
    speed: float = 1.0


@app.post("/api/generate/emotion-timeline")
async def generate_emotion_timeline(req: EmotionTimelineRequest):
    """Generate speech with different emotions per sentence."""
    voice = get_voice(req.voiceId)
    if not voice:
        raise HTTPException(404, f"Voice not found: {req.voiceId}")

    embedding_path = get_voice_embedding_path(req.voiceId)
    if not embedding_path:
        raise HTTPException(404, f"Voice embedding not found: {req.voiceId}")

    timeline = parse_emotion_timeline([s.model_dump() for s in req.segments])

    manager = get_manager()
    engine = manager.get_current_engine()

    audio_parts = []
    sample_rate = None
    for i, seg in enumerate(timeline):
        logger.info(f"  Timeline segment {i+1}/{len(timeline)}: [{seg['emotion']}] {seg['text'][:40]}...")
        audio_bytes = engine.generate_speech(
            text=seg["text"],
            embedding_path=embedding_path,
            language=req.language,
            emotion=seg["emotion"],
            speed=req.speed,
        )
        data, sr = sf.read(io.BytesIO(audio_bytes))
        if sample_rate is None:
            sample_rate = sr
        audio_parts.append(data)

    # Concatenate with tiny gaps
    silence = np.zeros(int(sample_rate * 0.1))
    combined = []
    for i, part in enumerate(audio_parts):
        combined.append(part)
        if i < len(audio_parts) - 1:
            combined.append(silence)

    result = np.concatenate(combined)
    buffer = io.BytesIO()
    sf.write(buffer, result, sample_rate, format="WAV")
    buffer.seek(0)
    audio_bytes = master_audio(buffer.getvalue())

    return Response(content=audio_bytes, media_type="audio/wav",
                    headers={"Content-Disposition": "attachment; filename=emotion_timeline.wav"})


# ==============================
# #9 — A/B Voice Comparison
# ==============================
class CompareRequest(BaseModel):
    text: str
    voiceIdA: str
    voiceIdB: str
    language: str = "English"


@app.post("/api/compare")
async def compare_voices(req: CompareRequest):
    """Generate the same text with two different voices for comparison."""
    import base64

    for label, vid in [("A", req.voiceIdA), ("B", req.voiceIdB)]:
        v = get_voice(vid)
        if not v:
            raise HTTPException(404, f"Voice {label} not found: {vid}")

    emb_a = get_voice_embedding_path(req.voiceIdA)
    emb_b = get_voice_embedding_path(req.voiceIdB)

    manager = get_manager()
    engine = manager.get_current_engine()

    results = {}
    for label, emb, vid in [("A", emb_a, req.voiceIdA), ("B", emb_b, req.voiceIdB)]:
        audio = engine.generate_speech(
            text=req.text, embedding_path=emb, language=req.language,
        )
        audio = master_audio(audio)
        results[label] = {
            "voice_id": vid,
            "size_bytes": len(audio),
            "audio_base64": base64.b64encode(audio).decode(),
        }

    return {"text": req.text, "results": results}


# ==============================
# #12 — Export Format Conversion
# ==============================
class ConvertRequest(BaseModel):
    text: str
    voiceId: str
    language: str = "English"
    format: str = "wav"  # wav, mp3, flac, ogg


@app.post("/api/generate/export")
async def generate_with_format(req: ConvertRequest):
    """Generate speech and export in the specified format (WAV, MP3, FLAC, OGG)."""
    voice = get_voice(req.voiceId)
    if not voice:
        raise HTTPException(404, f"Voice not found: {req.voiceId}")

    embedding_path = get_voice_embedding_path(req.voiceId)
    if not embedding_path:
        raise HTTPException(404, f"Voice embedding not found: {req.voiceId}")

    manager = get_manager()
    engine = manager.get_current_engine()

    audio_bytes = engine.generate_speech(
        text=req.text, embedding_path=embedding_path, language=req.language,
    )
    audio_bytes = master_audio(audio_bytes)

    # Convert to requested format
    converted, mime_type = convert_audio_format(audio_bytes, req.format)
    ext = req.format.lower() if req.format.lower() in {"wav", "mp3", "flac", "ogg"} else "wav"

    return Response(
        content=converted,
        media_type=mime_type,
        headers={"Content-Disposition": f"attachment; filename=output.{ext}"},
    )


# ==============================
# #1 — Voice Conversion (Stub)
# ==============================
@app.post("/api/voice-convert")
async def voice_conversion(
    audio: UploadFile = File(...),
    voiceId: str = Form(...),
):
    """Convert the voice in an audio file to a cloned voice. (Coming Soon)"""
    raise HTTPException(
        501,
        "Voice Conversion (SVC) is coming soon. It requires the RVC engine which is not yet integrated. "
        "Stay tuned for AI cover generation and voice swapping!"
    )


# ==============================
# #2 — Real-time Voice Changer (Stub)
# ==============================
@app.post("/api/voice-changer")
async def realtime_voice_changer():
    """Real-time voice transformation via WebSocket. (Coming Soon)"""
    raise HTTPException(
        501,
        "Real-time Voice Changer is coming soon. It requires a low-latency RVC pipeline. "
        "This will enable live voice transformation for streaming and gaming."
    )


# ==============================
# #10 — Voice Fine-tuning (Stub)
# ==============================
@app.post("/api/fine-tune")
async def voice_fine_tune(
    audio: UploadFile = File(...),
    voiceName: str = Form(...),
):
    """Upload 5+ minutes of audio to fine-tune a model on a specific voice. (Coming Soon)"""
    raise HTTPException(
        501,
        "Voice Fine-tuning is coming soon. This feature will allow training a custom model "
        "on your voice for dramatically higher quality cloning. Requires significant GPU resources."
    )
