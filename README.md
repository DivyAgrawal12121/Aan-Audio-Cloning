# Voice-Cloning-Modes-

# VoxForge - AI Voice Studio

VoxForge is a next-generation local AI audio workspace powered by the **Qwen3-TTS 1.7B** model. It features an ultra-modern Next.js dark-mode frontend interface combined with a FastAPI Python backend, designed to run 1.7-Billion-parameter Text-To-Speech inference natively on your hardware.

## Features
* 🎙️ **Zero-Shot Voice Cloning**: Upload a 3–10 second sample and instantly clone any voice.
* 🧠 **Voice Design**: Use natural text prompts (e.g., "A deep, raspy older man") to synthesize entirely new AI voices.
* 🗣️ **Ultra-Realistic Generation**: Synthesize speech with control over language, emotion, pitch, and speed.
* 📊 **Live Backend Sync**: Direct pipeline to the host GPU, featuring real-time loading and progress bar synchronization.

---

## 🛠 Prerequisites
* **OS:** Windows / Linux / macOS (Windows 11 with WSL2 / Native Python recommended)
* **GPU:** Minimum 8GB VRAM (NVIDIA CUDA recommended)
* **Python:** 3.10 to 3.12 (Python 3.14 may cause compatibility issues with certain torch library extensions)
* **Node.js:** v18 or higher (for the frontend)
* **ffmpeg:** Required for internal audio processing and conversions. Ensure `ffmpeg` is globally installed and on your system's PATH.

---

## 🚀 Installation Guide

### 1. Clone or Open the Repository
Navigate to the root directory `audio edit`:
```bash
cd "e:\Code Projects\editt\audio edit"
```

### 2. Backend Setup (AI & Server)
The backend requires a fully configured Python environment strictly containing the `qwen-tts` specific libraries. Attempting to run this via generic Transformers may cause architecture mismatch errors.

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
*Note: The first time you run this and generate a voice, the Qwen3-TTS-12Hz-1.7B-Base model (approx 3.5GB) will download from Hugging Face.*

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

---

## ⚠️ Troubleshooting & Known Solutions

We encountered and fixed several complex environment bugs during development. If you are modifying the backend or trying to run this on a fresh machine, refer strictly to these solutions.

### 🔴 Problem: "Failed to load model: The checkpoint has model type 'qwen3_tts' but Transformers does not recognize this architecture."
* **Symptom**: Audio generates as pure sine-wave "beeps". Logs indicate it fell back to demo mode. No VRAM is being used.
* **Cause**: `Qwen3-TTS` relies on a custom model mesh not yet available in the stable baseline `transformers` package.
* **Solution**: You must use the `qwen-tts` library natively. 
  1. `pip install -U qwen-tts`
  2. Ensure `tts_engine.py` calls `from qwen_tts import Qwen3TTSModel`. Do **not** use `AutoModelForCausalLM`.

### 🔴 Problem: `urllib.error.HTTPError: HTTP Error 403: Forbidden` during Voice Design or general TTS.
* **Symptom**: App crashes upon generation. Check `backend/data/voxforge.log` for the `Forbidden 403` error trace originating inside `qwen3_tts_model.py`.
* **Cause**: By default, the `qwen_tts` logic falls back to downloading a default reference `clone.wav` from a hardcoded Alibaba Cloud bucket (`qianwen-res.oss-cn-beijing.aliyuncs.com`) when doing generic voice generation. Alibaba Cloud frequently blocks external unauthenticated Python scrapes with a 403.
* **Solution (Already applied in code)**: We procedurally write a local 2-second synthesized sine wave (`backend/data/fallback.wav`) on backend boot, and intercept the model's `generate_voice_clone` logic to forcefully point `ref_audio=fallback_path` instead of the broken cloud URL. If you clear the `data` folder, the backend script will automatically recreate it.

### 🔴 Problem: `ModuleNotFoundError: No module named 'torchcodec'` or SoX Errors
* **Symptom**: Crash logs complain about `torchcodec` or `SoX could not be found!`.
* **Cause**: Backend audio streaming mismatch.
* **Solution**: This is a known audio loading quirk on Windows. The backend has been completely rewritten to bypass TorchAudio in favor of `soundfile`, `numpy`, and `io.BytesIO`. Do not revert the audio-saving pipelines in `tts_engine.py` back to `torchaudio`.

### 🔴 Problem: Progress Bars Sticking at 95%
* **Symptom**: The "Generating..." button stalls on 95%.
* **Cause**: The connection to the backend was severed, or your GPU doesn't have enough VRAM to finish the final audio generation pass.
* **Solution**: Check the terminal running Uvicorn. If it says "Killed" or "CUDA Out of Memory", you need to restart the backend. If your GPU has <6GB VRAM, the 1.7B TTS model may randomly OOM depending on context length.

---

## Architecture
- `backend/main.py`: FastAPI routes, CORS configuration.
- `backend/tts_engine.py`: Core PyTorch logic wrapper interfacing with the `qwen-tts` model.
- `backend/voice_store.py`: Disk-persistence logic saving generated UUID audio files and JSON embeddings to `<root>/data/...`.
- `frontend/src/app/...`: Next.js pages utilizing React state mapping to fetch endpoints.
