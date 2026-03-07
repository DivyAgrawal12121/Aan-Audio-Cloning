"""
Resound Studio - Text Chunker
==============================
Splits long text into sentence-level chunks for TTS generation.
This prevents OOM errors and improves quality for long passages.
"""

import re
import logging
from typing import List

logger = logging.getLogger("resound-studio.utils.chunker")

# Maximum characters per chunk — keeps each TTS generation manageable
DEFAULT_MAX_CHUNK_CHARS = 250


def split_into_sentences(text: str) -> List[str]:
    """
    Split text into sentences using common delimiters.
    Handles abbreviations and decimal numbers to avoid false splits.
    """
    # Protect common abbreviations from splitting
    text = re.sub(r'(Mr|Mrs|Ms|Dr|Prof|Jr|Sr|Inc|Ltd|etc)\.\s', r'\1<PERIOD> ', text)
    # Protect decimal numbers
    text = re.sub(r'(\d)\.(\d)', r'\1<DECIMAL>\2', text)

    # Split on sentence terminators followed by whitespace
    sentences = re.split(r'(?<=[.!?])\s+', text)

    # Restore protected periods and decimals
    sentences = [
        s.replace('<PERIOD>', '.').replace('<DECIMAL>', '.').strip()
        for s in sentences
        if s.strip()
    ]
    return sentences


def chunk_text(text: str, max_chars: int = DEFAULT_MAX_CHUNK_CHARS) -> List[str]:
    """
    Split long text into chunks that are each <= max_chars.
    Tries to split at sentence boundaries first, then at clause boundaries.

    Args:
        text: The input text to chunk
        max_chars: Max characters per chunk (default 250)

    Returns:
        List of text chunks, each <= max_chars
    """
    if not text or len(text) <= max_chars:
        return [text] if text else []

    sentences = split_into_sentences(text)
    chunks: List[str] = []
    current_chunk = ""

    for sentence in sentences:
        # If a single sentence is too long, split at clause boundaries
        if len(sentence) > max_chars:
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = ""

            # Split long sentence at commas, semicolons, colons, or dashes
            clauses = re.split(r'(?<=[,;:—–])\s+', sentence)
            for clause in clauses:
                if len(current_chunk) + len(clause) + 1 <= max_chars:
                    current_chunk = f"{current_chunk} {clause}".strip()
                else:
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                    # If even a single clause is too long, just take it as-is
                    current_chunk = clause
        elif len(current_chunk) + len(sentence) + 1 <= max_chars:
            current_chunk = f"{current_chunk} {sentence}".strip()
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence

    if current_chunk:
        chunks.append(current_chunk.strip())

    logger.info(f"Text chunked: {len(text)} chars → {len(chunks)} chunks")
    return chunks
