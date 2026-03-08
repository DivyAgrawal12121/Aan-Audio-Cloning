// ============================================
// Resound Studio - Centralized API Client
// ============================================

import axios from "axios";
import type {
    SavedVoice,
    GenerationRequest,
    ModelsResponse,
    AudioChannel,
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
    language: string,
    channelId?: string
): Promise<SavedVoice> {
    const response = await api.post("/api/design-voice", {
        description,
        name,
        language,
        channel_id: channelId,
    });
    return response.data;
}

export async function previewDesignVoice(
    description: string,
    language: string,
    text: string = "Hello, this is a preview of the designed voice."
): Promise<Blob> {
    const response = await api.post(
        "/api/design-voice/preview",
        { description, language, text },
        { responseType: "blob" }
    );
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

// ---- Voice Profile Samples (multi-sample) ----
export async function addVoiceSample(
    voiceId: string,
    audioFile: File | Blob,
    referenceText: string = ""
): Promise<{ id: string; profile_id: string; duration: number | null }> {
    const formData = new FormData();
    formData.append("audio", audioFile);
    formData.append("reference_text", referenceText);
    const response = await api.post(`/api/voices/${voiceId}/samples`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
}

export interface VoiceSample {
    id: string;
    profile_id: string;
    reference_text: string;
    duration_seconds: number | null;
    is_primary: boolean;
    audio_url: string;
    createdAt: string;
}

export async function getVoiceSamples(voiceId: string): Promise<VoiceSample[]> {
    const response = await api.get(`/api/voices/${voiceId}/samples`);
    return response.data;
}

export async function deleteVoiceSample(voiceId: string, sampleId: string): Promise<void> {
    await api.delete(`/api/voices/${voiceId}/samples/${sampleId}`);
}

export async function importVoice(formData: FormData): Promise<SavedVoice> {
    const response = await api.post("/api/voices/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
}

// ---- Generation History ----
export interface HistoryItem {
    id: string;
    profile_id: string;
    voice_name: string | null;
    text: string;
    language: string;
    emotion: string;
    speed: number;
    pitch: number;
    style: string | null;
    engine_id: string;
    audio_url: string;
    duration_seconds: number | null;
    file_size_bytes: number | null;
    createdAt: string;
}

export interface HistoryResponse {
    total: number;
    offset: number;
    limit: number;
    items: HistoryItem[];
}

export interface HistoryFilters {
    profile_id?: string;
    search?: string;
    limit?: number;
    offset?: number;
}

export async function getHistory(params?: HistoryFilters): Promise<HistoryResponse> {
    const response = await api.get("/api/history", { params });
    return response.data;
}

export function getHistoryAudioUrl(genId: string): string {
    return `${BACKEND_URL}/api/history/${genId}/audio`;
}

export async function deleteHistoryItem(genId: string): Promise<void> {
    await api.delete(`/api/history/${genId}`);
}

export async function clearHistory(profileId?: string): Promise<{ deleted_count: number }> {
    const response = await api.delete("/api/history", {
        params: profileId ? { profile_id: profileId } : undefined,
    });
    return response.data;
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

export interface PodcastBlock {
    voice_id: string;
    text: string;
}

export async function generatePodcastTimeline(data: {
    story_name: string;
    language: string;
    blocks: PodcastBlock[];
}): Promise<{ story_id: string }> {
    const response = await api.post("/api/podcast/generate-timeline", data);
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

// ---- Stories / Timeline Editor ----
export async function getStories(): Promise<any[]> {
    const response = await api.get("/api/stories");
    return response.data;
}

export async function createStory(data: { name: string; description?: string }): Promise<any> {
    const response = await api.post("/api/stories", data);
    return response.data;
}

export async function getStoryDetails(storyId: string): Promise<any> {
    const response = await api.get(`/api/stories/${storyId}`);
    return response.data;
}

export async function deleteStory(storyId: string): Promise<void> {
    await api.delete(`/api/stories/${storyId}`);
}

export async function addStoryItem(storyId: string, data: { generation_id: string; position_ms: number; track: number }): Promise<any> {
    const response = await api.post(`/api/stories/${storyId}/items`, data);
    return response.data;
}

export async function moveStoryItem(storyId: string, itemId: string, data: { position_ms: number; track?: number }): Promise<any> {
    const response = await api.put(`/api/stories/${storyId}/items/${itemId}/move`, data);
    return response.data;
}

export async function trimStoryItem(storyId: string, itemId: string, data: { trim_start_ms: number; trim_end_ms: number }): Promise<any> {
    const response = await api.put(`/api/stories/${storyId}/items/${itemId}/trim`, data);
    return response.data;
}

export async function deleteStoryItem(storyId: string, itemId: string): Promise<void> {
    await api.delete(`/api/stories/${storyId}/items/${itemId}`);
}


// ============================================
// AUDIO CHANNELS
// ============================================

export async function getChannels(): Promise<AudioChannel[]> {
    const response = await api.get("/api/channels");
    return response.data;
}

export async function createChannel(data: { name: string; color?: string }): Promise<AudioChannel> {
    const response = await api.post("/api/channels", data);
    return response.data;
}

export async function updateChannel(id: string, data: { name?: string; color?: string }): Promise<AudioChannel> {
    const response = await api.patch(`/api/channels/${id}`, data);
    return response.data;
}

export async function deleteChannel(id: string): Promise<void> {
    await api.delete(`/api/channels/${id}`);
}
