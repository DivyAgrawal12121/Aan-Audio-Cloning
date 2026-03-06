# Resound Studio — AI Voice Studio

> Local-first AI voice cloning, text-to-speech, and audio generation powered by multiple open-source models.

![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.10+-green)
![Next.js](https://img.shields.io/badge/next.js-16-black)

## ✨ Features

- **Voice Cloning** — Clone any voice from a 3–10 second audio sample
- **Text-to-Speech** — Generate ultra-realistic speech with emotion & speed control
- **Voice Design** — Create new voices from text descriptions
- **Sound Effects (Foley)** — Generate sound effects from text prompts
- **Cross-Lingual Dubbing** — Clone a voice and speak in another language
- **Podcast Studio** — Multi-speaker podcast generation  
- **Audio Inpainting** — Fix specific words in generated audio
- **Multi-Model Architecture** — Switch between 8+ TTS engines on-the-fly

## 🏗️ Architecture

This is a **pnpm monorepo** with the following structure:

```
├── apps/
│   ├── web/          → Next.js 16 frontend (React, TypeScript, Tailwind CSS)
│   └── api/          → Python FastAPI backend (multi-engine TTS)
├── packages/
│   └── shared/       → Shared TypeScript types & constants
├── pnpm-workspace.yaml
└── package.json      → Root workspace scripts
```

### Supported AI Models

| Model | Capabilities | VRAM |
|-------|-------------|------|
| Qwen3-TTS 1.7B | Clone, Generate, Design | ~4 GB |
| F5-TTS | Fast Clone, Podcast | ~3 GB |
| CosyVoice v2 | Cross-Lingual, Emotion | ~4 GB |
| XTTS v2 | Cross-Lingual Clone | ~3 GB |
| Fish Speech | LLM Audio, Podcast | ~4 GB |
| Parler-TTS | Prompt-Based Design | ~3 GB |
| Bark | Foley, Sound Effects | ~5 GB |

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and **pnpm** (`npm i -g pnpm`)
- **Python** 3.10+
- **CUDA GPU** with 4+ GB VRAM (recommended)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/resound-studio.git
cd resound-studio

# Install frontend + shared packages
pnpm install

# Install backend Python dependencies
cd apps/api
pip install -r requirements.txt
cd ../..
```

### 2. Start Development

```bash
# Start the Next.js frontend (http://localhost:3000)
pnpm dev

# In another terminal — start the Python backend (http://localhost:8000)
pnpm dev:api
```

### 3. Environment Variables (Optional)

```bash
cp .env.example .env.local
```

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:8000` | Backend API URL |
| `TTS_DEVICE` | `cuda` | GPU device (`cuda` / `cpu`) |

## 🧑‍💻 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run `pnpm build` to verify the frontend builds
5. Submit a Pull Request

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend not connecting | Make sure `apps/api` server is running on port 8000 |
| CUDA out of memory | Try a smaller model or use CPU mode (`TTS_DEVICE=cpu`) |
| Module not found errors | Run `pnpm install` from the root directory |
| Python import errors | Make sure you're running from `apps/api/` directory |
