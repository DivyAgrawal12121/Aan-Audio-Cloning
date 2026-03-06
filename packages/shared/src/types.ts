// ============================================
// Resound Studio Shared — Type Definitions
// ============================================

export interface SavedVoice {
    id: string;
    name: string;
    description: string;
    language: string;
    createdAt: string;
    audioSampleUrl?: string;
    embeddingPath: string;
    tags: string[];
}

export interface GenerationRequest {
    text: string;
    voiceId: string;
    language: string;
    emotion?: string;
    speed?: number;
    pitch?: number;
    duration?: number;
    paralinguistics?: string[];
    style?: string;
}

export interface GenerationResponse {
    audioUrl: string;
    duration: number;
    sampleRate: number;
}

export interface CloneRequest {
    audioFile: File;
    voiceName: string;
    description?: string;
    tags?: string[];
}

export interface VoiceDesignRequest {
    description: string;
    name: string;
    language: string;
}

export interface HealthData {
    status: string;
    active_model: string;
    device: string;
}

export type Emotion =
    | "neutral"
    | "happy"
    | "sad"
    | "angry"
    | "fearful"
    | "surprised"
    | "disgusted"
    | "whispering"
    | "excited"
    | "calm";

export type SupportedLanguage =
    | "English"
    | "Hindi"
    | "Chinese"
    | "Japanese"
    | "Korean"
    | "German"
    | "French"
    | "Russian"
    | "Portuguese"
    | "Spanish"
    | "Italian";
