"""
Resound Studio - Advanced Features Module
==========================================
Contains logic for all Part 3 features:
  - Multi-speaker conversation generator
  - Audiobook generator
  - Voice library (export/import)
  - Subtitle/SRT generator
  - Background music mixing
  - Emotion timeline
  - A/B voice comparison
  - Audio format conversion
"""

import io
import os
import re
import json
import zipfile
import shutil
import logging
import hashlib
from datetime import datetime
from typing import List, Dict, Optional, Tuple

import numpy as np
import soundfile as sf

logger = logging.getLogger("resound-studio.features")


# ==============================
# #3 — Multi-Speaker Conversation
# ==============================
def parse_multi_speaker_script(script: str) -> List[Dict[str, str]]:
    """
    Parse a script with speaker labels like:
      A: Hello, how are you?
      B: I'm fine, thanks!
      C: Hey everyone!
    
    Returns list of {"speaker": "A", "text": "Hello, how are you?"}
    """
    lines = []
    # Match lines like "A:" or "Speaker1:" or "Alice:"
    pattern = re.compile(r'^([A-Za-z0-9_]+)\s*:\s*(.+)$', re.MULTILINE)
    
    for match in pattern.finditer(script):
        speaker = match.group(1).strip()
        text = match.group(2).strip()
        if text:
            lines.append({"speaker": speaker, "text": text})
    
    # If no speaker labels found, treat each line as alternating speakers
    if not lines:
        raw_lines = [l.strip() for l in script.strip().split("\n") if l.strip()]
        speakers = ["A", "B"]
        for i, line in enumerate(raw_lines):
            lines.append({"speaker": speakers[i % len(speakers)], "text": line})
    
    return lines


def generate_multi_speaker_audio(
    script_lines: List[Dict[str, str]],
    voice_map: Dict[str, str],  # speaker_label -> embedding_path
    engine,
    default_language: str = "English",
    gap_seconds: float = 0.3
) -> bytes:
    """
    Generate multi-speaker audio from parsed script lines.
    Each speaker uses their assigned voice embedding.
    """
    segments = []
    sample_rate = None

    for i, line in enumerate(script_lines):
        speaker = line["speaker"]
        text = line["text"]

        embedding_path = voice_map.get(speaker)
        if not embedding_path:
            logger.warning(f"No voice assigned for speaker '{speaker}', skipping line {i}")
            continue

        logger.info(f"  [{speaker}]: {text[:50]}...")
        audio_bytes = engine.generate_speech(
            text=text,
            embedding_path=embedding_path,
            language=default_language,
        )

        audio_data, sr = sf.read(io.BytesIO(audio_bytes))
        if sample_rate is None:
            sample_rate = sr
        segments.append(audio_data)

    if not segments:
        raise RuntimeError("No audio segments generated")

    # Concatenate with silence gaps
    silence = np.zeros(int(sample_rate * gap_seconds))
    combined = []
    for i, seg in enumerate(segments):
        combined.append(seg)
        if i < len(segments) - 1:
            combined.append(silence)

    result = np.concatenate(combined)
    buffer = io.BytesIO()
    sf.write(buffer, result, sample_rate, format="WAV")
    buffer.seek(0)
    return buffer.getvalue()


# ==============================
# #4 — Audiobook Generator
# ==============================
def split_into_chapters(text: str) -> List[Dict[str, str]]:
    """
    Split text into chapters based on common markers:
    "Chapter 1:", "CHAPTER ONE", "Part 1", numbered sections, etc.
    """
    # Try to split on chapter markers
    chapter_pattern = re.compile(
        r'(?:^|\n)\s*(Chapter\s+\d+|CHAPTER\s+\w+|Part\s+\d+|PART\s+\w+|Section\s+\d+)\s*[:\.\-—]?\s*([^\n]*)',
        re.IGNORECASE
    )
    
    matches = list(chapter_pattern.finditer(text))
    
    if matches:
        chapters = []
        for i, match in enumerate(matches):
            title = f"{match.group(1).strip()}"
            subtitle = match.group(2).strip()
            if subtitle:
                title = f"{title}: {subtitle}"
            
            start = match.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            content = text[start:end].strip()
            
            if content:
                chapters.append({"title": title, "content": content})
        return chapters
    
    # Fallback: split into ~500 word chunks
    words = text.split()
    chunk_size = 500
    chapters = []
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chapters.append({
            "title": f"Section {len(chapters) + 1}",
            "content": chunk
        })
    
    return chapters


def detect_dialogue(text: str) -> List[Dict[str, str]]:
    """
    Detect dialogue in text and split into narration vs speech.
    Returns list of {"type": "narration"|"dialogue", "text": "..."}
    """
    parts = []
    # Match quoted speech
    pattern = re.compile(r'(".*?"|\'.*?\'|".*?")')
    
    last_end = 0
    for match in pattern.finditer(text):
        # Narration before this dialogue
        if match.start() > last_end:
            narration = text[last_end:match.start()].strip()
            if narration:
                parts.append({"type": "narration", "text": narration})
        # The dialogue itself
        parts.append({"type": "dialogue", "text": match.group(0).strip('"\'""')})
        last_end = match.end()
    
    # Remaining narration
    if last_end < len(text):
        remaining = text[last_end:].strip()
        if remaining:
            parts.append({"type": "narration", "text": remaining})
    
    # If no dialogue found, return the whole text as narration
    if not parts:
        parts.append({"type": "narration", "text": text})
    
    return parts


# ==============================
# #5 — Voice Library (Export/Import)
# ==============================
VOICE_EXPORT_VERSION = "1.0"


def export_voice(voice_id: str, voices_dir: str) -> bytes:
    """
    Export a voice as a .resound ZIP file containing:
    - meta.json (voice metadata)
    - embedding.pt (voice embedding)
    - sample.wav (reference audio)
    """
    voice_dir = os.path.join(voices_dir, voice_id)
    if not os.path.exists(voice_dir):
        raise FileNotFoundError(f"Voice directory not found: {voice_id}")

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add export metadata
        export_meta = {
            "export_version": VOICE_EXPORT_VERSION,
            "exported_at": datetime.utcnow().isoformat() + "Z",
            "voice_id": voice_id,
        }
        zf.writestr("export.json", json.dumps(export_meta, indent=2))

        # Add voice files
        for filename in ["meta.json", "embedding.pt", "sample.wav"]:
            filepath = os.path.join(voice_dir, filename)
            if os.path.exists(filepath):
                zf.write(filepath, filename)

    buffer.seek(0)
    return buffer.getvalue()


def import_voice(resound_bytes: bytes, voices_dir: str) -> dict:
    """
    Import a .resound file. Returns the imported voice metadata.
    """
    import uuid

    buffer = io.BytesIO(resound_bytes)
    with zipfile.ZipFile(buffer, "r") as zf:
        names = zf.namelist()
        if "meta.json" not in names:
            raise ValueError("Invalid .resound file: missing meta.json")

        # Read original metadata
        meta = json.loads(zf.read("meta.json"))

        # Generate new voice ID for the import
        new_id = str(uuid.uuid4())
        new_dir = os.path.join(voices_dir, new_id)
        os.makedirs(new_dir, exist_ok=True)

        # Extract files
        for filename in ["embedding.pt", "sample.wav"]:
            if filename in names:
                with open(os.path.join(new_dir, filename), "wb") as f:
                    f.write(zf.read(filename))

        # Update metadata with new ID
        meta["id"] = new_id
        meta["importedAt"] = datetime.utcnow().isoformat() + "Z"
        meta["embeddingPath"] = os.path.join(new_dir, "embedding.pt")
        meta["audioSampleUrl"] = f"/api/voices/{new_id}/sample"

        with open(os.path.join(new_dir, "meta.json"), "w") as f:
            json.dump(meta, f, indent=2)

    return meta


# ==============================
# #6 — Subtitle/SRT Generator
# ==============================
def generate_srt(segments: List[Dict], start_time: float = 0.0) -> str:
    """
    Generate SRT subtitle content from timed segments.
    Each segment: {"text": "...", "start": 0.0, "end": 2.5}
    """
    srt_lines = []
    for i, seg in enumerate(segments, 1):
        start = _format_srt_time(seg["start"] + start_time)
        end = _format_srt_time(seg["end"] + start_time)
        srt_lines.append(f"{i}")
        srt_lines.append(f"{start} --> {end}")
        srt_lines.append(seg["text"])
        srt_lines.append("")

    return "\n".join(srt_lines)


def estimate_segment_timing(
    text_chunks: List[str],
    total_audio_duration: float
) -> List[Dict]:
    """
    Estimate timing for each text chunk based on character count proportion.
    """
    total_chars = sum(len(c) for c in text_chunks)
    if total_chars == 0:
        return []

    segments = []
    current_time = 0.0
    for chunk in text_chunks:
        proportion = len(chunk) / total_chars
        duration = proportion * total_audio_duration
        segments.append({
            "text": chunk,
            "start": round(current_time, 3),
            "end": round(current_time + duration, 3),
        })
        current_time += duration

    return segments


def _format_srt_time(seconds: float) -> str:
    """Format seconds as SRT timestamp: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


# ==============================
# #7 — Background Music Mixing
# ==============================
def mix_audio_with_music(
    voice_bytes: bytes,
    music_bytes: bytes,
    music_volume: float = 0.15,
    fade_in_seconds: float = 1.0,
    fade_out_seconds: float = 2.0,
) -> bytes:
    """
    Mix voice audio with background music.
    Music is ducked to music_volume (0.0-1.0) relative to voice.
    Applies fade in/out to the music track.
    """
    voice_data, voice_sr = sf.read(io.BytesIO(voice_bytes))
    music_data, music_sr = sf.read(io.BytesIO(music_bytes))

    # Convert music to mono if needed
    if len(music_data.shape) > 1:
        music_data = music_data.mean(axis=1)
    if len(voice_data.shape) > 1:
        voice_data = voice_data.mean(axis=1)

    # Resample music to match voice sample rate if different
    if music_sr != voice_sr:
        ratio = voice_sr / music_sr
        new_len = int(len(music_data) * ratio)
        indices = np.linspace(0, len(music_data) - 1, new_len)
        music_data = np.interp(indices, np.arange(len(music_data)), music_data).astype(np.float32)

    # Loop music to match voice length
    voice_len = len(voice_data)
    if len(music_data) < voice_len:
        repeats = (voice_len // len(music_data)) + 1
        music_data = np.tile(music_data, repeats)
    music_data = music_data[:voice_len]

    # Apply fade in
    fade_in_samples = int(fade_in_seconds * voice_sr)
    if fade_in_samples > 0 and fade_in_samples < len(music_data):
        fade_in = np.linspace(0, 1, fade_in_samples)
        music_data[:fade_in_samples] *= fade_in

    # Apply fade out
    fade_out_samples = int(fade_out_seconds * voice_sr)
    if fade_out_samples > 0 and fade_out_samples < len(music_data):
        fade_out = np.linspace(1, 0, fade_out_samples)
        music_data[-fade_out_samples:] *= fade_out

    # Mix: voice at full volume, music ducked
    mixed = voice_data + (music_data * music_volume)

    # Normalize to prevent clipping
    peak = np.abs(mixed).max()
    if peak > 0.95:
        mixed = mixed / peak * 0.95

    buffer = io.BytesIO()
    sf.write(buffer, mixed, voice_sr, format="WAV")
    buffer.seek(0)
    return buffer.getvalue()


# ==============================
# #8 — Emotion Timeline
# ==============================
def parse_emotion_timeline(timeline: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """
    Parse an emotion timeline. Input format:
    [
        {"text": "I'm so happy today!", "emotion": "happy"},
        {"text": "But then I heard the news.", "emotion": "sad"},
        {"text": "And I was furious!", "emotion": "angry"},
    ]
    Returns validated list.
    """
    valid_emotions = {"neutral", "happy", "sad", "angry", "excited", "calm", "serious", "whisper", "surprised"}
    validated = []
    for item in timeline:
        emotion = item.get("emotion", "neutral").lower()
        if emotion not in valid_emotions:
            emotion = "neutral"
        validated.append({
            "text": item.get("text", ""),
            "emotion": emotion,
        })
    return validated


# ==============================
# #12 — Audio Format Conversion
# ==============================
def convert_audio_format(wav_bytes: bytes, target_format: str) -> Tuple[bytes, str]:
    """
    Convert WAV audio to another format.
    Returns (converted_bytes, mime_type).
    
    Supported: wav, mp3, flac, ogg
    """
    target_format = target_format.lower().strip()

    if target_format == "wav":
        return wav_bytes, "audio/wav"

    audio_data, sr = sf.read(io.BytesIO(wav_bytes))

    if target_format == "flac":
        buffer = io.BytesIO()
        sf.write(buffer, audio_data, sr, format="FLAC")
        buffer.seek(0)
        return buffer.getvalue(), "audio/flac"

    if target_format == "ogg":
        buffer = io.BytesIO()
        sf.write(buffer, audio_data, sr, format="OGG", subtype="VORBIS")
        buffer.seek(0)
        return buffer.getvalue(), "audio/ogg"

    if target_format == "mp3":
        # Try pydub for MP3 encoding
        try:
            from pydub import AudioSegment
            wav_buffer = io.BytesIO(wav_bytes)
            audio_seg = AudioSegment.from_wav(wav_buffer)
            mp3_buffer = io.BytesIO()
            audio_seg.export(mp3_buffer, format="mp3", bitrate="192k")
            mp3_buffer.seek(0)
            return mp3_buffer.getvalue(), "audio/mpeg"
        except ImportError:
            logger.warning("pydub not installed. Falling back to FLAC for MP3 request.")
            buffer = io.BytesIO()
            sf.write(buffer, audio_data, sr, format="FLAC")
            buffer.seek(0)
            return buffer.getvalue(), "audio/flac"

    # Unknown format, return WAV
    logger.warning(f"Unknown format '{target_format}', returning WAV")
    return wav_bytes, "audio/wav"
