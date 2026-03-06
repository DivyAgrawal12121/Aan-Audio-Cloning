import re
import io
import numpy as np
import soundfile as sf
import logging
from typing import Optional

logger = logging.getLogger("resound-studio.utils.audio")

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

