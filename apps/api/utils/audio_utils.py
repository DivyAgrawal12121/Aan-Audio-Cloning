import re
import io
import numpy as np
import soundfile as sf
import logging
from typing import Optional, Tuple

logger = logging.getLogger("resound-studio.utils.audio")

try:
    import librosa
except ImportError:
    librosa = None
    logger.warning("librosa is not installed. Advanced audio loading/processing will be limited.")

try:
    from num2words import num2words
except ImportError:
    num2words = None
    logger.warning("num2words is not installed. Number to text normalization will be skipped.")

try:
    from pedalboard import Pedalboard, Compressor, NoiseGate, HighShelfFilter
except ImportError:
    Pedalboard = None
    logger.warning("pedalboard is not installed. Audio mastering will be skipped.")

try:
    import noisereduce as nr
except ImportError:
    nr = None
    logger.warning("noisereduce is not installed. Reference audio sanitization will be skipped.")


# ============================================
# AUDIO LOADING & VALIDATION (Phase 0)
# ============================================

def load_audio(path: str, sample_rate: int = 24000, mono: bool = True) -> Tuple[np.ndarray, int]:
    """
    Load audio with consistent resampling via librosa.
    Always returns (audio_array, sample_rate) at the target sample rate.
    Falls back to soundfile if librosa is not available.
    """
    if librosa is not None:
        audio, sr = librosa.load(path, sr=sample_rate, mono=mono)
        return audio.astype(np.float32), sr
    else:
        audio, sr = sf.read(path)
        if mono and len(audio.shape) > 1:
            audio = audio.mean(axis=1)
        return audio.astype(np.float32), sr


def load_audio_bytes(audio_bytes: bytes, sample_rate: int = 24000, mono: bool = True) -> Tuple[np.ndarray, int]:
    """
    Load audio from bytes with consistent resampling.
    """
    import tempfile, os
    if librosa is not None:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            audio, sr = librosa.load(tmp_path, sr=sample_rate, mono=mono)
            return audio.astype(np.float32), sr
        finally:
            os.unlink(tmp_path)
    else:
        audio, sr = sf.read(io.BytesIO(audio_bytes))
        if mono and len(audio.shape) > 1:
            audio = audio.mean(axis=1)
        return audio.astype(np.float32), sr


def validate_reference_audio(
    audio_path: str = None,
    audio_bytes: bytes = None,
    min_duration: float = 2.0,
    max_duration: float = 30.0,
    min_rms: float = 0.01,
) -> Tuple[bool, Optional[str]]:
    """
    Validate reference audio for voice cloning quality.
    Checks: duration (2-30s), volume (not too quiet), clipping (not too loud).
    
    Returns:
        (is_valid, error_message) — error_message is None if valid.
    """
    try:
        if audio_path:
            audio, sr = load_audio(audio_path)
        elif audio_bytes:
            audio, sr = load_audio_bytes(audio_bytes)
        else:
            return False, "No audio provided"

        # Duration check
        duration = len(audio) / sr
        if duration < min_duration:
            return False, f"Audio too short ({duration:.1f}s). Minimum is {min_duration}s for quality cloning."
        if duration > max_duration:
            return False, f"Audio too long ({duration:.1f}s). Maximum is {max_duration}s. Please trim your recording."

        # Volume check (not too quiet / silent)
        rms = np.sqrt(np.mean(audio ** 2))
        if rms < min_rms:
            return False, "Audio is too quiet or silent. Please record with more volume."

        # Clipping detection (not too loud)
        peak = np.abs(audio).max()
        if peak > 0.99:
            return False, "Audio is clipping (distorted). Please reduce your recording gain."

        return True, None

    except Exception as e:
        return False, f"Failed to validate audio: {str(e)}"


def normalize_audio(audio: np.ndarray, target_db: float = -20.0, peak_limit: float = 0.85) -> np.ndarray:
    """
    Normalize audio to a target RMS dB level with peak limiting.
    Ensures consistent loudness across all reference samples.
    
    Args:
        audio: Audio array (float32)
        target_db: Target RMS level in dB (default: -20dB)
        peak_limit: Maximum absolute sample value (default: 0.85)
    
    Returns:
        Normalized audio array
    """
    audio = audio.astype(np.float32)
    rms = np.sqrt(np.mean(audio ** 2))
    
    if rms > 0:
        target_rms = 10 ** (target_db / 20)
        gain = target_rms / rms
        audio = audio * gain
    
    # Peak limiting to prevent clipping
    audio = np.clip(audio, -peak_limit, peak_limit)
    return audio


def _replace_numbers_with_words(match) -> str:
    """Helper to convert regex number matches to words."""
    if num2words is None:
        return match.group(0)
    try:
        num = int(match.group(0))
        return num2words(num)
    except Exception:
        return match.group(0)


def normalize_text(text: str) -> str:
    """
    Cleans up text for better TTS pronounceability.
    - Expands numbers into words (e.g., "123" -> "one hundred and twenty-three").
    - Replaces custom breathing/pause tags with punctuation that models understand.
    - Removes excessive whitespace.
    """
    if not text:
        return text

    # 1. Expand numbers to words
    if num2words is not None:
        # Match whole numbers
        text = re.sub(r'\b\d+\b', _replace_numbers_with_words, text)

    # 2. Handle specific structural tags for zero-shot models
    # Models like Qwen and F5 often interpret "..." or "—" as a pause or breath.
    text = text.replace("[pause]", "...")
    text = text.replace("[pause x2]", "......")
    text = text.replace("[breath]", "—")
    
    # 3. Clean up whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text


def master_audio(audio_bytes: bytes, sample_rate: int = 24000) -> bytes:
    """
    Applies a studio-quality mastering chain to raw TTS output bytes.
    - Noise Gate: Removes low-level hiss often found in zero-shot cloning.
    - Compressor: Evens out the volume to podcast standards.
    - High-Shelf Filter: Adds crispness to the high frequencies.
    """
    if Pedalboard is None:
        return audio_bytes # Skip if not installed

    try:
        # 1. Read the raw bytes into a numpy array
        audio_data, file_sr = sf.read(io.BytesIO(audio_bytes))
        
        # Ensure audio is mono or appropriately shaped for pedalboard
        if len(audio_data.shape) > 1 and audio_data.shape[1] > 1:
             audio_data = audio_data.mean(axis=1) # downmix to mono for simple processing

        # Pedalboard expects shape (channels, samples)
        if len(audio_data.shape) == 1:
             audio_data = np.expand_dims(audio_data, axis=0)
        else:
             audio_data = audio_data.T

        # 2. Define the studio mastering chain
        board = Pedalboard([
            NoiseGate(threshold_db=-45.0, ratio=1.5, release_ms=250),
            Compressor(threshold_db=-15.0, ratio=2.5, attack_ms=2.0, release_ms=100),
            HighShelfFilter(cutoff_frequency_hz=8000.0, gain_db=3.0) # Adds "crispness"
        ])

        # 3. Process the audio
        processed_audio = board(audio_data, file_sr)

        # 4. Convert back to WAV bytes
        # soundfile expects (samples, channels)
        processed_audio = processed_audio.T
        
        buffer = io.BytesIO()
        sf.write(buffer, processed_audio, file_sr, format="WAV")
        buffer.seek(0)
        
        return buffer.getvalue()
    except Exception as e:
        logger.error(f"Error during audio mastering: {e}. Returning original audio.")
        return audio_bytes

def sanitize_reference_audio(audio_bytes: bytes) -> bytes:
    """
    Cleans up user-uploaded reference audio by reducing background noise/static.
    This helps the cloning models focus purely on the voice.
    """
    if nr is None:
        return audio_bytes
        
    try:
        audio_data, file_sr = sf.read(io.BytesIO(audio_bytes))
        
        # noisereduce works best with (channels, samples)
        if len(audio_data.shape) > 1:
            audio_data = audio_data.T # e.g. (2, samples)
            
        # Perform noise reduction
        reduced_noise = nr.reduce_noise(y=audio_data, sr=file_sr, prop_decrease=0.8)
        
        # soundfile expects (samples, channels)
        if len(audio_data.shape) > 1:
            reduced_noise = reduced_noise.T
            
        buffer = io.BytesIO()
        sf.write(buffer, reduced_noise, file_sr, format="WAV")
        buffer.seek(0)
        
        return buffer.getvalue()
    except Exception as e:
        logger.error(f"Error during reference noise reduction: {e}. Returning original audio.")
        return audio_bytes

