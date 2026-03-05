// ============================================
// VoxForge - API Client
// ============================================

import axios from "axios";
import type {
    SavedVoice,
    GenerationRequest,
    GenerationResponse,
} from "./types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const api = axios.create({
    baseURL: BACKEND_URL,
    timeout: 120000, // 2 minutes for TTS generation
});

// ---- Voice Cloning ----
export async function cloneVoice(formData: FormData): Promise<SavedVoice> {
    const response = await api.post("/api/clone", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
}

// ---- Voice Design (text description) ----
export async function designVoice(
    description: string,
    name: string,
    language: string
): Promise<SavedVoice> {
    const response = await api.post("/api/design-voice", {
        description,
        name,
        language,
    });
    return response.data;
}

// ---- TTS Generation ----
export async function generateSpeech(
    request: GenerationRequest
): Promise<Blob> {
    const response = await api.post("/api/generate", request, {
        responseType: "blob",
    });
    return response.data;
}

// ---- Saved Voices ----
export async function getVoices(): Promise<SavedVoice[]> {
    const response = await api.get("/api/voices");
    return response.data;
}

export async function deleteVoice(id: string): Promise<void> {
    await api.delete(`/api/voices/${id}`);
}

// ---- Voice Preview ----
export async function previewVoice(voiceId: string, text?: string): Promise<Blob> {
    const response = await api.post(
        "/api/preview",
        { voiceId, text: text || "Hello, this is a preview of my voice." },
        { responseType: "blob" }
    );
    return response.data;
}
