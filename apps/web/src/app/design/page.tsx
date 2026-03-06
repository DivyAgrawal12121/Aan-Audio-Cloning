"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, Wand2, CheckCircle2, AlertCircle } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";
import ProgressBar from "@/components/ProgressBar";
import { SUPPORTED_LANGUAGES } from "@/lib/types";
import { designVoice, previewVoice } from "@/lib/api";

const VOICE_PRESETS = [
    {
        label: "Warm Narrator",
        description:
            "A mature male voice, warm and deep, like a seasoned audiobook narrator. Calm pacing, rich bass tones.",
    },
    {
        label: "Young Energetic",
        description:
            "A young, enthusiastic female voice with high energy. Quick pacing, bright and cheerful tone.",
    },
    {
        label: "News Anchor",
        description:
            "Professional, authoritative mid-range voice. Clear articulation, neutral accent, steady pace.",
    },
    {
        label: "Storyteller",
        description:
            "A gentle, slightly raspy elderly voice. Slow, measured pacing with dramatic pauses. Warm and wise.",
    },
    {
        label: "AI Assistant",
        description:
            "A clear, androgynous voice. Perfectly enunciated, calm and helpful. Medium pitch, neutral emotion.",
    },
    {
        label: "Dramatic Actor",
        description:
            "Deep theatrical voice with dramatic range. Powerful projection, commanding presence, British accent.",
    },
];

export default function DesignPage() {
    const [description, setDescription] = useState("");
    const [voiceName, setVoiceName] = useState("");
    const [language, setLanguage] = useState("English");
    const [isDesigning, setIsDesigning] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [statusMessage, setStatusMessage] = useState("");
    const [designProgress, setDesignProgress] = useState(0);

    const handleDesign = async () => {
        if (!description.trim() || !voiceName.trim()) return;

        setIsDesigning(true);
        setStatus("idle");
        setDesignProgress(0);

        try {
            const voice = await designVoice(description.trim(), voiceName.trim(), language);

            // Get preview of the new voice
            try {
                const blob = await previewVoice(voice.id);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(URL.createObjectURL(blob));
            } catch {
                // Preview might not work if model is warm
            }

            setStatus("success");
            setStatusMessage(
                `Voice "${voiceName}" designed and saved successfully!`
            );
        } catch (err: unknown) {
            setStatus("error");
            const errorMsg =
                err instanceof Error
                    ? err.message
                    : "Failed to design voice. Make sure the backend is running.";
            setStatusMessage(errorMsg);
        } finally {
            setDesignProgress(100);
            setTimeout(() => {
                setIsDesigning(false);
                setDesignProgress(0);
            }, 500);
        }
    };

    React.useEffect(() => {
        if (isDesigning && designProgress < 95) {
            const timer = setInterval(() => {
                setDesignProgress(prev => Math.min(prev + Math.random() * 5, 95));
            }, 800);
            return () => clearInterval(timer);
        }
    }, [isDesigning, designProgress]);

    return (
        <div className="page-container-sm">
            {/* Header */}
            <div style={{ marginBottom: "36px" }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        marginBottom: "12px",
                    }}
                >
                    <div
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: "14px",
                            background: "linear-gradient(135deg, #ec4899, #f43f5e)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 8px 24px rgba(236, 72, 153, 0.25)",
                        }}
                    >
                        <Sparkles size={22} color="white" />
                    </div>
                    <div>
                        <h1
                            style={{
                                fontSize: "1.8rem",
                                fontWeight: 800,
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Voice Design
                        </h1>
                        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                            Create entirely new voices using natural language descriptions
                        </p>
                    </div>
                </div>
            </div>

            {/* Design Form */}
            <div
                className="glass-card"
                style={{ padding: "28px", marginBottom: "20px" }}
            >
                <p className="section-label">Voice Description</p>
                <p
                    style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                        marginBottom: "16px",
                        lineHeight: 1.5,
                    }}
                >
                    Describe the voice you want to create. Include details about timbre,
                    age, gender, accent, tone, and personality.
                </p>
                <textarea
                    className="text-area"
                    placeholder="e.g., A deep, gravelly male voice with a slight Southern American accent. Warm and reassuring, like a grandfather telling bedtime stories. Slow, deliberate pacing."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ minHeight: "140px" }}
                />
            </div>

            {/* Presets */}
            <div
                className="glass-card"
                style={{ padding: "28px", marginBottom: "20px" }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "16px",
                    }}
                >
                    <Wand2 size={16} color="var(--accent-pink)" />
                    <p className="section-label" style={{ margin: 0 }}>
                        Try a preset
                    </p>
                </div>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px",
                    }}
                >
                    {VOICE_PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => {
                                setDescription(preset.description);
                                if (!voiceName) setVoiceName(preset.label);
                            }}
                            style={{
                                textAlign: "left",
                                padding: "14px 16px",
                                borderRadius: "var(--radius-md)",
                                background:
                                    description === preset.description
                                        ? "rgba(236, 72, 153, 0.1)"
                                        : "rgba(139, 92, 246, 0.04)",
                                border:
                                    description === preset.description
                                        ? "1px solid rgba(236, 72, 153, 0.3)"
                                        : "1px solid var(--border-subtle)",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                color: "var(--text-primary)",
                            }}
                            onMouseEnter={(e) => {
                                if (description !== preset.description) {
                                    e.currentTarget.style.background =
                                        "rgba(139, 92, 246, 0.08)";
                                    e.currentTarget.style.borderColor =
                                        "rgba(139, 92, 246, 0.2)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (description !== preset.description) {
                                    e.currentTarget.style.background =
                                        "rgba(139, 92, 246, 0.04)";
                                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                                }
                            }}
                        >
                            <p
                                style={{
                                    fontWeight: 600,
                                    fontSize: "0.88rem",
                                    marginBottom: "4px",
                                }}
                            >
                                {preset.label}
                            </p>
                            <p
                                style={{
                                    fontSize: "0.78rem",
                                    color: "var(--text-muted)",
                                    lineHeight: 1.4,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                }}
                            >
                                {preset.description}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Name & Language */}
            <div
                className="glass-card"
                style={{ padding: "28px", marginBottom: "20px" }}
            >
                <p className="section-label">Save As</p>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                        marginTop: "12px",
                    }}
                >
                    <div>
                        <label
                            style={{
                                display: "block",
                                fontSize: "0.82rem",
                                color: "var(--text-secondary)",
                                marginBottom: "6px",
                                fontWeight: 500,
                            }}
                        >
                            Voice Name *
                        </label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="e.g., Warm Narrator"
                            value={voiceName}
                            onChange={(e) => setVoiceName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label
                            style={{
                                display: "block",
                                fontSize: "0.82rem",
                                color: "var(--text-secondary)",
                                marginBottom: "6px",
                                fontWeight: 500,
                            }}
                        >
                            Language
                        </label>
                        <select
                            className="select-field"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                        >
                            {SUPPORTED_LANGUAGES.map((lang) => (
                                <option key={lang} value={lang}>
                                    {lang}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Preview */}
            {previewUrl && (
                <div style={{ marginBottom: "20px" }}>
                    <AudioPlayer
                        audioUrl={previewUrl}
                        label="Voice Preview"
                        showDownload={false}
                    />
                </div>
            )}

            {/* Status */}
            {status !== "idle" && (
                <div
                    style={{
                        padding: "14px 20px",
                        borderRadius: "var(--radius-md)",
                        marginBottom: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        background:
                            status === "success"
                                ? "rgba(34, 197, 94, 0.08)"
                                : "rgba(239, 68, 68, 0.08)",
                        border: `1px solid ${status === "success"
                            ? "rgba(34, 197, 94, 0.2)"
                            : "rgba(239, 68, 68, 0.2)"
                            }`,
                    }}
                >
                    {status === "success" ? (
                        <CheckCircle2 size={18} color="#22c55e" />
                    ) : (
                        <AlertCircle size={18} color="#ef4444" />
                    )}
                    <span
                        style={{
                            fontSize: "0.88rem",
                            color: status === "success" ? "#22c55e" : "#ef4444",
                        }}
                    >
                        {statusMessage}
                    </span>
                </div>
            )}

            {/* Generate Button */}
            <ProgressBar
                progress={designProgress}
                isActive={isDesigning}
                label={isDesigning ? "Designing new voice from description..." : "Design complete!"}
                accentColor="#ec4899"
                accentColorEnd="#f59e0b"
            />

            <button
                className="glow-btn"
                onClick={handleDesign}
                disabled={!description.trim() || !voiceName.trim() || isDesigning}
                style={{
                    width: "100%",
                    padding: "16px",
                    fontSize: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    background: "linear-gradient(135deg, #ec4899, #f43f5e)",
                    position: "relative",
                    overflow: "hidden"
                }}
            >
                {isDesigning && (
                    <div
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            height: "100%",
                            width: `${Math.round(designProgress)}%`,
                            background: "rgba(255, 255, 255, 0.15)",
                            transition: "width 0.5s ease"
                        }}
                    />
                )}
                {isDesigning ? (
                    <>
                        <Loader2 size={18} className="pulse-glow" style={{ animation: "pulse-glow 1s ease-in-out infinite" }} />
                        Designing Voice... {Math.round(designProgress)}%
                    </>
                ) : (
                    <>
                        <Sparkles size={18} />
                        Design & Save Voice
                    </>
                )}
            </button>
        </div>
    );
}
