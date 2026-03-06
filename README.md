# VoxForge - Multi-Engine AI Voice Studio

VoxForge is a next-generation local AI audio workspace powered by a **Multi-Model Architecture**. It features an ultra-modern Next.js dark-mode frontend interface combined with a FastAPI Python backend, designed to run various state-of-the-art Text-To-Speech inference engines natively on your hardware.

## Features

With **8 AI Engines Available** (including Qwen, CosyVoice, Bark, F5, Fish, Parler, and XTTS), VoxForge offers comprehensive audio generation capabilities:

* 🎙️ **Voice Cloning**: Clone any voice from a short sample. Zero-shot, instant, reusable.
* 🧠 **Voice Design**: Design entirely new voices from text descriptions — no samples needed.
* 🗣️ **Ultra-Realistic Generation**: Synthesize speech with control over language, emotion, pacing, and paralinguistic elements.
* 🎵 **Sound Effects (Foley)**: Generate foley and ambient audio by describing any sound you can imagine.
* 🌍 **Voice Dubbing**: Clone your voice and have it speak fluent French, Japanese, Hindi, and more (11+ supported languages).
* 🎙️ **Podcast Studio**: Write a script and auto-generate a full two-speaker podcast episode.
* 🧽 **Audio Inpainting**: Fix stumbles or coughs in recordings by regenerating just the bad segment.
* 📊 **Live Backend Sync**: Direct pipeline to the host GPU, featuring real-time loading and progress bar synchronization.

---

## 🛠 Prerequisites

* **OS:** Windows / Linux / macOS (Windows 11 with WSL2 / Native Python recommended)
* **GPU:** Minimum 8GB VRAM (NVIDIA CUDA strongly recommended for running multiple models)
* **Python:** 3.10 to 3.12 
* **Node.js:** v18 or higher (for the frontend)
* **ffmpeg:** Required for internal audio processing and conversions. Ensure `ffmpeg` is globally installed and on your system's PATH.

---

## 🚀 Installation Guide

### 1. Clone or Open the Repository
Navigate to the root directory `audio edit`:
```bash
git clone https://github.com/DivyAgrawal12121/Voice-Cloning-Modes-.git "audio edit"
cd "audio edit"
```

### 2. Backend Setup (AI & Server)
The backend requires a fully configured Python environment. 

```bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Linux/Mac:
# source venv/bin/activate

# Install the dependencies
pip install -r requirements.txt
```

*(Optional but highly recommended)*: Make sure you install the correct Torch version configured for your GPU's CUDA runtime (e.g., CUDA 11.8 or 12.x).
```bash
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### 3. Frontend Setup (Next.js UI)
The frontend uses standard Next.js routing and components.

```bash
cd frontend
npm install
```

---

## 💻 Running the Application

You will need two terminal windows open simultaneously.

**Terminal 1 (Backend):**
```bash
cd backend
# Ensure your virtual environment is activated
python -m uvicorn main:app --reload --port 8000
```
*Note: The system dynamically loads models (like Qwen, Bark, CosyVoice) as they are requested. Model weights will be downloaded from Hugging Face on their first execution.*

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

---

## Architecture details

- **Backend**: Python FastAPI handling the API footprint, with modular files inside `backend/engines/` abstracting the generation logic via an `engine_manager.py` layer. 
- **Storage**: `backend/voice_store.py` manages disk-persistence handling generated audio and voice embeddings.
- **Frontend**: Next.js 14+ App Router (`frontend/src/app/...`) utilizing React state patterns paired with a rich, glassmorphism-inspired TailwindCSS UI.

---

## ⚠️ Troubleshooting & Known Solutions

### Progress Bars Sticking at 95%
* **Symptom**: The "Generating..." button stalls on 95%.
* **Cause**: The connection to the backend was severed, or your GPU doesn't have enough VRAM to finish the final audio generation pass.
* **Solution**: Check the terminal running Uvicorn. If it says "Killed" or "CUDA Out of Memory", you need to restart the backend. Consider generating shorter segments or switching to a lighter model if your hardware has under 8GB VRAM.

### Audio Loading Quirks (Windows)
* Due to standard SOX and torchaudio streaming issues on Windows, Ensure your environment has `soundfile` + `ffmpeg` correctly set up to handle file buffering and WAV byte manipulation.
