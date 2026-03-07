// ============================================
// Resound Studio Shared — Constants
// ============================================

import type { SupportedLanguage, Emotion } from "./types";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
    "English",
    "Hindi",
    "Chinese",
    "Japanese",
    "Korean",
    "German",
    "French",
    "Russian",
    "Portuguese",
    "Spanish",
    "Italian",
];

export const EMOTIONS: Emotion[] = [
    "neutral",
    "happy",
    "sad",
    "angry",
    "fearful",
    "surprised",
    "disgusted",
    "whispering",
    "excited",
    "calm",
];

export const PARALINGUISTICS = [
    "(laughs)",
    "(coughs)",
    "(gasps)",
    "(sighs)",
    "(clears throat)",
    "(sniffs)",
    "(yawns)",
    "(whispers)",
];

export const CAP_STYLE: Record<string, { label: string; color: string; bg: string }> = {
    clone: { label: "Clone", color: "#000", bg: "var(--accent-purple)" },
    generate: { label: "TTS", color: "#000", bg: "var(--accent-cyan)" },
    design: { label: "Design", color: "#000", bg: "var(--accent-pink)" },
    foley: { label: "Foley", color: "#000", bg: "var(--accent-amber)" },
    music: { label: "Music", color: "#000", bg: "var(--accent-amber)" },
    emotion: { label: "Emotion", color: "#000", bg: "var(--accent-pink)" },
    cross_lingual: { label: "Multilingual", color: "#000", bg: "var(--accent-purple)" },
    speed: { label: "Fast", color: "#000", bg: "var(--accent-green)" },
};

export const PHASE_COLORS: Record<string, string> = {
    unloading: "#f59e0b",
    importing: "#a855f7",
    downloading: "#06b6d4",
    loading_gpu: "#ec4899",
    ready: "#22c55e",
    error: "#ef4444",
};
