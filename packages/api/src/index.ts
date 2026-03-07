// ============================================
// Resound Studio - Centralized API Client
// ============================================

import axios from "axios";
import type {
    SavedVoice,
    GenerationRequest,
    ModelsResponse,
} from "@resound-studio/shared";

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

// ---- Foley / Sound Effects ----
export async function generateFoley(description: string): Promise<Blob> {
    const response = await api.post("/api/foley", { description }, {
        responseType: "blob",
    });
    return response.data;
}

// ---- Voice Dubbing ----
export async function dubVoice(data: {
    text: string;
    voiceId: string;
    sourceLang: string;
    targetLang: string;
}): Promise<Blob> {
    const response = await api.post("/api/dubbing", data, {
        responseType: "blob",
    });
    return response.data;
}

// ---- Podcast Studio ----
export async function generatePodcast(data: {
    script: string;
    voiceIdA: string;
    voiceIdB: string;
    language?: string;
}): Promise<Blob> {
    const response = await api.post("/api/podcast", data, {
        responseType: "blob",
    });
    return response.data;
}

// ---- Audio Inpainting ----
export async function inpaintAudio(formData: FormData): Promise<Blob> {
    const response = await api.post("/api/inpaint", formData, {
        responseType: "blob",
    });
    return response.data;
}

// ---- Model Management ----
export async function getModels(): Promise<ModelsResponse> {
    const response = await api.get("/api/models", {
        headers: { "Cache-Control": "no-store" },
    });
    return response.data;
}

export function getModelLoadStreamUrl(modelId: string): string {
    return `${BACKEND_URL}/api/models/load-stream?model_id=${encodeURIComponent(modelId)}`;
}

export async function unloadModel(modelId: string): Promise<void> {
    await api.post("/api/models/unload", { model_id: modelId });
}

// ---- Server Logs ----
export async function getLogs(): Promise<string> {
    const response = await api.get("/api/logs");
    return response.data.logs || "NO LOGS IN VAULT.";
}

// ---- Health Check ----
export async function checkHealth(backendUrl?: string): Promise<{
    status: string;
    active_model: string;
    device: string;
}> {
    const url = backendUrl || BACKEND_URL;
    const response = await axios.get(`${url}/health`, { timeout: 5000 });
    return response.data;
}
