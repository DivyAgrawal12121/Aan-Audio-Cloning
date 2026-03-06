# VoxForge — Architecture

> Multi-model AI voice studio with a modular engine system

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        pnpm Monorepo                            │
│                                                                 │
│  ┌──────────────┐   HTTP/REST   ┌────────────────────────────┐  │
│  │  apps/web    │ ────────────► │  apps/api                  │  │
│  │  Next.js 16  │ ◄──────────── │  FastAPI (Python)          │  │
│  │              │               │                            │  │
│  │  • Dashboard │   JSON/WAV    │  ┌──────────────────────┐  │  │
│  │  • Clone     │               │  │  Engine Manager      │  │  │
│  │  • Generate  │               │  │  (1 model in VRAM)   │  │  │
│  │  • Design    │               │  │                      │  │  │
│  │  • Foley     │               │  │  ┌────────────────┐  │  │  │
│  │  • Dubbing   │               │  │  │ Active Engine  │  │  │  │
│  │  • Podcast   │               │  │  │ (e.g. Qwen)   │  │  │  │
│  │  • Inpaint   │               │  │  └────────────────┘  │  │  │
│  │  • Voices    │               │  └──────────────────────┘  │  │
│  │  • Settings  │               │                            │  │
│  └──────────────┘               │  ┌──────────────────────┐  │  │
│                                 │  │  Voice Store         │  │  │
│  ┌──────────────┐               │  │  (Local filesystem)  │  │  │
│  │ packages/    │               │  └──────────────────────┘  │  │
│  │  shared/     │               └────────────────────────────┘  │
│  │  • types     │                                               │
│  │  • constants │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16 + TypeScript | UI, routing, SSR |
| Styling | Tailwind CSS v4 + vanilla CSS | Design system |
| Backend | Python FastAPI | REST API server |
| AI Models | Qwen3-TTS, F5-TTS, Bark, XTTS, etc. | Voice synthesis |
| Storage | Local filesystem (JSON + .pt + .wav) | Voice data |
| Package Manager | pnpm (workspaces) | Monorepo management |

---

## Monorepo Structure

```
├── apps/
│   ├── web/            Next.js frontend
│   │   ├── src/
│   │   │   ├── app/        Pages (App Router)
│   │   │   ├── components/ Reusable UI components
│   │   │   ├── hooks/      Custom React hooks
│   │   │   └── lib/        API client + type re-exports
│   │   └── package.json
│   │
│   └── api/            Python FastAPI backend
│       ├── main.py         API endpoints + lifespan
│       ├── engine_manager.py   Model lifecycle manager
│       ├── voice_store.py      Local voice storage
│       ├── engines/            Model wrapper plugins
│       └── requirements.txt
│
├── packages/
│   └── shared/         Shared TypeScript types & constants
│
├── pnpm-workspace.yaml
├── package.json        Root workspace scripts
└── .env.example
```

---

## Engine Manager — Multi-Model Architecture

The Engine Manager ensures **only one model lives in VRAM at a time**. It handles:

1. **Model Registry** — Defines all available models with metadata (VRAM, capabilities, HuggingFace ID)
2. **Lazy Loading** — Models are only loaded when explicitly requested
3. **Hot Swapping** — Unloads the current model, runs GC, then loads the new one
4. **SSE Progress** — Streams real-time loading progress to the frontend via Server-Sent Events

### Available Engines

| Engine | Model | Capabilities |
|--------|-------|-------------|
| `QwenEngine` | Qwen3-TTS 1.7B | Clone, Generate, Design |
| `QwenDesignEngine` | Qwen3-TTS (design variant) | Voice Design |
| `F5Engine` | F5-TTS | Fast Clone, Podcast |
| `CosyVoiceEngine` | CosyVoice v2 | Cross-Lingual, Emotion |
| `XTTSEngine` | XTTS v2 | Cross-Lingual Clone |
| `FishEngine` | Fish Speech v1.4 | LLM Audio, Podcast |
| `ParlerEngine` | Parler-TTS | Prompt-Based Design |
| `BarkEngine` | Suno Bark | Foley, Sound Effects |

### Engine Interface

All engines implement `BaseEngine` with:

```python
class BaseEngine(ABC):
    def load(self) -> None          # Load model into VRAM
    def unload(self) -> None        # Free VRAM + GC
    def clone_voice(bytes) -> dict  # Extract speaker embedding
    def generate_speech(...) -> bytes  # Text → WAV audio
    def get_capabilities() -> list  # What this engine supports
```

---

## Voice Storage

Voices are stored locally at `apps/api/data/voices/`:

```
data/voices/
├── {uuid}/
│   ├── meta.json       # name, description, language, tags, createdAt
│   ├── embedding.pt    # PyTorch speaker embedding tensor
│   └── sample.wav      # Original audio sample (for cloning)
```

---

## Data Flow

### Voice Cloning
```
User uploads .wav → Frontend sends FormData → Backend extracts embedding
→ Saves embedding.pt + meta.json + sample.wav → Returns voice metadata
```

### Speech Generation
```
User enters text + selects voice → Frontend sends JSON request
→ Backend loads embedding.pt → Engine generates WAV → Returns audio bytes
```

### Model Switching
```
User selects model in sidebar → Frontend opens SSE connection
→ Backend unloads current → Downloads new (if needed) → Loads to GPU
→ Streams progress events → Frontend shows live progress bar
```
