# Contributing to VoxForge

Thanks for your interest in contributing! VoxForge is open source and we welcome contributions of all sizes — from fixing typos to building entire features.

---

## Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_USERNAME/voxforge.git
cd voxforge
```

### 2. Install Dependencies

```bash
# Frontend + shared packages
pnpm install

# Backend (Python)
cd apps/api
pip install -r requirements.txt
cd ../..
```

### 3. Start Dev Servers

```bash
pnpm dev        # Next.js frontend → http://localhost:3000
pnpm dev:api    # FastAPI backend  → http://localhost:8000
```

---

## Project Structure

```
apps/web/           → Next.js frontend
apps/api/           → Python FastAPI backend
packages/shared/    → Shared types & constants
docs/               → Documentation
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a detailed breakdown.

---

## Making Changes

### Branch Naming

```
feature/voice-morphing
fix/settings-health-check
docs/update-readme
refactor/extract-audio-hook
```

### Commit Messages

Use clear, conventional-style commit messages:

```
feat: add voice morphing UI
fix: correct health endpoint type mismatch
docs: update architecture diagram
refactor: extract useSimulatedProgress hook
chore: remove unused dependencies
```

---

## Pull Requests

1. **Create a feature branch** from `main`
2. **Make your changes** with clear commits
3. **Test locally:**
   - `pnpm build` — frontend compiles without errors
   - `pnpm lint` — no lint warnings
   - Backend starts without import errors
4. **Open a PR** with a clear description of what you changed and why
5. **Link any related issues** in the PR description

### PR Checklist

- [ ] Code builds without errors (`pnpm build`)
- [ ] No lint warnings (`pnpm lint`)
- [ ] New features have proper UI feedback (loading states, error messages)
- [ ] Shared types updated in `packages/shared/` if applicable
- [ ] Documentation updated if adding new endpoints or features

---

## Code Style

### Frontend (TypeScript / React)
- Use functional components with hooks
- Extract repeated logic into custom hooks (`src/hooks/`)
- Use CSS classes from `globals.css` over inline styles when possible
- Import shared types from `@/lib/types` (re-exports from `@voxforge/shared`)

### Backend (Python)
- Follow PEP 8
- Add docstrings to all API endpoints
- Use `logger.info()` / `logger.error()` for logging (not `print()`)
- New engines must extend `BaseEngine` in `engines/`
- Use `except Exception:` — never bare `except:`

---

## Adding a New TTS Engine

1. Create `apps/api/engines/your_engine.py`
2. Extend `BaseEngine` and implement all required methods
3. Register it in `engine_manager.py` → `AVAILABLE_MODELS` dict
4. Add the model's capabilities metadata (VRAM, features, HuggingFace ID)
5. Test: load the model, clone a voice, generate speech

---

## Reporting Issues

- Use GitHub Issues
- Include: steps to reproduce, expected vs actual behavior, error logs
- For GPU/CUDA issues, include: GPU model, driver version, VRAM available

---

## Code of Conduct

Please read our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inclusive experience for everyone.
