# Resound Studio — Product Requirements

> Last Updated: 2026-03-06

## Overview

Resound Studio is a **local-first** web application for AI voice synthesis. It provides a premium, professional-grade interface for voice cloning, voice design, and text-to-speech generation with full emotional and stylistic control.

**Core Principle:** All processing and storage happens locally on the user's device — no cloud APIs, no data leaves your machine.

---

## Core Features

### Voice Cloning
- Upload a 3–10 second audio sample (WAV, MP3, FLAC, OGG, M4A)
- Extract a speaker embedding via the active TTS model
- Save the embedding + metadata locally on device
- Name, describe, tag, and select language for each voice
- Audio preview of uploaded sample before cloning
- Reuse saved voices across unlimited future generations

### Text-to-Speech Generation
- Select a saved voice from the library
- Enter text script (up to 5,000 characters)
- Choose target language from 11 supported languages
- **Emotion control:** neutral, happy, sad, angry, fearful, surprised, disgusted, whispering, excited, calm
- **Speed control:** 0.5x to 2.0x
- **Pitch control:** 0.5x to 2.0x
- **Duration control:** force exact seconds
- **Style instructions** via natural language prompts
- **Paralinguistic tags:** `(laughs)`, `(coughs)`, `(gasps)`, `(sighs)`, `(clears throat)`, `(sniffs)`, `(yawns)`, `(whispers)`
- Audio output with waveform player + download

### Voice Design (Natural Language)
- Describe a voice that doesn't exist using text
- Specify timbre, age, gender, accent, tone, personality
- 6 built-in presets: Warm Narrator, Young Energetic, News Anchor, Storyteller, AI Assistant, Dramatic Actor
- Save designed voices to local library
- Preview designed voices immediately

### Sound Effects (Foley)
- Generate sound effects from text descriptions
- Powered by Bark model

### Cross-Lingual Dubbing
- Clone a voice and generate speech in a different language
- Powered by CosyVoice or XTTS v2

### Podcast Studio
- Multi-speaker podcast generation from a script
- Assign different voices to speakers
- Powered by F5-TTS or Fish Speech

### Audio Inpainting
- Fix specific words in previously generated audio
- Keeps the same voice characteristics

### Voice Library
- View all saved voices (cloned + designed)
- Search/filter by name, description, language, tags
- Preview any voice with one click
- Delete voices
- Voice metadata: name, description, language, tags, creation date

---

## Supported Languages

English, Hindi, Chinese, Japanese, Korean, German, French, Russian, Portuguese, Spanish, Italian

---

## Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/clone` | Upload audio → extract embedding → save voice |
| `POST` | `/api/design-voice` | Text description → generate embedding → save |
| `POST` | `/api/generate` | Text + voice + settings → WAV audio |
| `POST` | `/api/preview` | Voice ID → short preview WAV |
| `GET` | `/api/voices` | List all saved voices |
| `GET` | `/api/voices/{id}` | Get single voice details |
| `DELETE` | `/api/voices/{id}` | Delete a voice and all data |
| `GET` | `/api/voices/{id}/sample` | Download original audio sample |
| `GET` | `/api/models` | List available AI models |
| `GET` | `/api/models/load-stream` | SSE stream for model loading progress |
| `POST` | `/api/models/load` | Switch active AI model |
| `POST` | `/api/foley` | Generate sound effects |
| `POST` | `/api/dubbing` | Cross-lingual voice dubbing |
| `POST` | `/api/podcast` | Multi-speaker podcast generation |
| `POST` | `/api/inpaint` | Fix specific words in audio |
| `GET` | `/api/logs` | Retrieve backend server logs |
| `GET` | `/health` | Backend health + model status |
