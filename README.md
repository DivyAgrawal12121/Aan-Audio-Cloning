# 🎙️ Resound Studio — AI Voice Studio

> **Local-first** AI voice cloning, text-to-speech, and audio generation powered by multiple state-of-the-art open-source models.
> 
> *Proudly made by [Arcade Alliance Network Studios](https://arcadealliancenetwork.com) and released completely Open-Source for the public.*

![Python](https://img.shields.io/badge/python-3.10+-green)
![Next.js](https://img.shields.io/badge/next.js-16-black)
![License](https://img.shields.io/badge/license-MIT-blue)

**Resound Studio** is a professional-grade AI audio production platform designed to run entirely locally on your machine. It features a stunning modern frontend and a powerful multi-model FastAPI backend that allows you to clone voices, generate highly emotive speech, design entirely new voices, and mix complex audio tracks—all without relying on cloud APIs.

---

## ✨ Comprehensive Feature Set

### 1. Voice Cloning & Generation
- **Zero-Shot Voice Cloning**: Clone any voice perfectly using just a 3–10 second clean audio clip.
- **Emotion & Paralinguistic Control**: Inject natural emotions (happy, sad, angry, whispers, laughs, sighs) directly into generated speech.
- **High-Fidelity TTS**: Ultra-realistic text-to-speech outperforming typical open-source models.
- **Voice Library (The Vault)**: Save, manage, export, and import cloned voices as portable `.resound` files.

### 2. Creative Audio Tools
- **Voice Design**: Create completely new voices from scratch using only a text prompt (e.g., *"A warm, deep, slightly raspy elderly narrator"*).
- **Sound Effects (Foley)**: Generate ambient noise, sound effects, or background audio via text prompt.
- **Cross-Lingual Dubbing**: Automatically clone a speaker's voice and generate speech in a requested target language (supports 11+ languages).
- **Podcast Studio**: Write a script with two speakers (A & B), assign voices, and automatically generate a naturally-paced podcast episode.
- **Multi-Speaker Conversations**: Complex multi-turn scripts with unlimited actors.
- **Audio Inpainting**: Provide a source audio file, highlight a stumble or error, supply the corrected text, and punch-in a fix using the exact same tone.

### 3. Engineering & Performance
- **Multi-Engine Intelligence**: Seamlessly switch between 8 different underlying models. The frontend intelligently routes tasks to the best-suited model.
- **GPU Accelerated**: Fully optimized for CUDA, including automatic VRAM management and caching.
- **Streaming Audio**: Generates and streams audio back to the frontend in real-time (Server-Sent Events).
- **Audio Caching layer**: Disk-backed caching system caches generation requests preventing duplicate AI computation.

---

## 🏗️ Supported AI Models & Requirements

Resound Studio utilizes a dynamic engine manager capable of loading and unloading large models into VRAM to prevent Out-Of-Memory (OOM) errors.

| Model Engine | Primary Superpower | Min VRAM required |
|--------------|-------------------|-------------------|
| **Qwen3-TTS** (Default) | Ultra-fast cloning, generation, and multi-lingual processing. | ~4 GB |
| **F5-TTS** | Speedy podcast generation & zero-shot cloning. | ~3 GB |
| **CosyVoice v2** | Superior emotional control & Cross-Lingual Dubbing. | ~4 GB |
| **XTTS v2** | Highly robust cross-lingual cloning (17+ languages). | ~3 GB |
| **Fish Speech** | LLM-based intelligent audio pacing. | ~4 GB |
| **Parler-TTS** | Prompt-based Voice Design (Creating voices from descriptions). | ~3 GB |
| **Bark** | General audio generation (Music, Foley, Sound Effects, non-speech audio). | ~5 GB |

---

## ⚙️ Exhaustive Setup Guide

Running local AI requires specific system dependencies. **Do not skip these steps**, especially the system-level binaries.

### Step 1: System Prerequisites

Before touching the code, ensure your system has the required tooling:

1. **Python**: Install Python 3.10 or 3.11. (Python 3.12+ may have compatibility issues with PyTorch wrappers).
2. **Node.js**: Install Node.js v18+.
3. **pnpm**: Install globally via `npm install -g pnpm`.
4. **CUDA Toolkit**: If you have an NVIDIA GPU, install the [CUDA Toolkit 12.1 or 11.8](https://developer.nvidia.com/cuda-downloads).
5. **C++ Build Tools (Windows)**: Required for compiling `flash-attn` and some Torchaudio components. Download [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/), and during setup select **"Desktop development with C++"**.

### Step 2: System Binaries (FFmpeg & SoX) — Critical!

Our audio processing pipelines require underlying system binaries.

**For FFmpeg:**
- **Windows**: `winget install ffmpeg` (or download from gyan.dev and add to system PATH).
- **Mac**: `brew install ffmpeg`
- **Linux**: `sudo apt install ffmpeg`

**For SoX (Sound eXchange):**
- **Windows**: Download from [SourceForge](https://sourceforge.net/projects/sox/). Extract the folder, and **add the folder path to your system's Environment Variables `PATH`**.
- **Mac**: `brew install sox`
- **Linux**: `sudo apt install sox`

> **Note**: If you don't install SoX correctly, you will see the warning: `Warning: SoX could not be found!` and certain voice resampling pipelines will fail or fallback to slower numpy arrays.

### Step 3: Clone & Build

```bash
# 1. Clone the repository
git clone https://github.com/your-username/resound-studio.git
cd resound-studio

# 2. Install all Frontend dependencies
pnpm install
```

### Step 4: Backend Python Setup

It is highly recommended to use a virtual environment!

```bash
cd apps/api

# 1. Create and activate virtual environment
python -m venv venv

# Windows Activation:
.\venv\Scripts\activate
# Mac/Linux Activation:
source venv/bin/activate

# 2. Install PyTorch with CUDA support FIRST (Adjust URL for your CUDA version)
# E.g., for CUDA 12.1:
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# 3. Install remaining dependencies
pip install -r requirements.txt
```

### Step 4.5: Pre-downloading Models (Highly Recommended)

While Resound Studio will download models automatically when you first use them, you can pre-download all of them at once to avoid waiting later.

**On Windows:**
Run the `download_models.bat` file in the root directory.

**Manual (Any OS):**
```bash
# Activate your backend venv first
cd apps/api
source venv/bin/activate  # or .\venv\Scripts\activate on Windows

# Use the Hugging Face CLI to download the Qwen family
huggingface-cli download Qwen/Qwen3-TTS-12Hz-1.7B-Base
huggingface-cli download Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign
huggingface-cli download Qwen/Qwen3-TTS-12Hz-0.6B-Base
```

### Step 5: Start the Platform

You need to run two terminal windows.

**Terminal 1 (Backend API):**
```bash
cd apps/api
# Make sure your venv is activated!
pnpm dev:api   # This runs: uvicorn main:app --reload --port 8000
```

**Terminal 2 (Frontend):**
```bash
# From the root directory
pnpm dev
```

Finally, open your browser and navigate to `http://localhost:3000`.

---

## 🛠️ Detailed Troubleshooting & Common Errors

Local AI is powerful but finicky. If you run into issues, consult this exhaustive list:

| The Error / Symptom | What it means | The Fix |
|:---|:---|:---|
| **`Warning: flash-attn is not installed. Will only run the manual PyTorch version. Please install flash-attn for faster inference.`** | `flash-attn` optimizes transformer layers for huge speed boosts on Ampere+ GPUs (RTX 3000/4000). You don't *need* it, but it makes things 2x faster. | On Windows, ensure you installed *Visual Studio C++ Build Tools*. Then run: `pip install flash-attn --no-build-isolation`. If it constantly fails, you can safely ignore the warning—the models will still work, just slightly slower. |
| **`'sox' is not recognized as an internal or external command`** | The API uses SoX for rapid audio resampling and normalization. It cannot find the executable in your PATH. | **Windows**: Download SoX, place the `sox.exe` folder somewhere permanent (like `C:\sox`), and add that exact folder to your Windows "`Path`" Environment Variable. Restart your terminal. |
| **`CUDA out of memory`** or **`OutOfMemoryError`** | The currently loaded AI model requires more VRAM than your GPU has available. | 1. Go to the "Model Manager" page and manually unload the active model.<br>2. Try a smaller model like `qwen-tts`.<br>3. Keep your input text shorter (under 250 characters per prompt). |
| **`The currently loaded model does not support [Feature]`** | You are trying to use a feature (like Foley/Sound Effects or complex Dubbing) that the currently loaded model engine wasn't designed for. | E.g., for Sound Effects, go to the Sidebar's **Model Selector** and switch the engine to **Bark**. For Dubbing, switch to **XTTS v2**. |
| **Backend crash on startup: `ModuleNotFoundError`** | You're missing a Python dependency listed in requirements. | Ensure you've activated your virtual environment, and run `pip install -r requirements.txt`. Ensure you also installed **TTS** via `pip install TTS`. |
| **Frontend Network Error (`fetch failed` / `CORS`)** | The Next.js frontend cannot reach the FastAPI backend over port `8000`. | 1. Verify `pnpm dev:api` is running without errors.<br>2. Create a `.env.local` in `/apps/web` with `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`. |
| **Audio generation is taking 2+ minutes** | CPU Fallback or massive script. | Ensure you installed PyTorch with the correct `--index-url` for your CUDA version so it runs on GPU. If generating a giant Podcast script, wait—it chunks it automatically but takes time. |

---

## 🏗️ Monorepo Structure

```text
resound-studio/
├── apps/
│   ├── web/                     # Next.js Frontend
│   │   ├── src/app/             # Pages (Dashboard, Clone, Generate, etc.)
│   │   ├── src/components/      # UI (AudioPlayer, Sidebar, VoiceCard, etc.)
│   │   └── src/lib/             # API clients and TypeScript types
│   │
│   └── api/                     # Python FastAPI Backend
│       ├── main.py              # Main REST/SSE Router & Controllers
│       ├── engine_manager.py    # VRAM loader & engine switcher
│       ├── engines/             # Isolated wrappers for each TTS architecture
│       │   ├── qwen_engine.py
│       │   ├── f5_engine.py
│       │   ├── bark_engine.py
│       │   └── ...
│       └── utils/               # Text chunking, caching, API keys
│
├── .env.example
├── package.json
└── pnpm-workspace.yaml
```

## 👩‍💻 Contributing
Contributions are absolutely welcome! Whether you are integrating a new open-source TTS model into the `engines/` directory, improving the frontend design, or squashing bugs.

1. Fork the repo and create your branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes.
3. Open a Pull Request!

## 📜 License & Acknowledgements

**Resound Studio** was developed by the team at [**Arcade Alliance Network Studios**](https://arcadealliancenetwork.com) and is proudly released **Open-Source** to the public under the MIT License.

*Note that while the studio platform is MIT Licensed, individual AI models (like Bark, Qwen, XTTS) downloaded by this software retain their original creators' licenses (some of which may restrict commercial use).*
