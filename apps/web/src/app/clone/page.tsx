"use client";

import React, { useState } from "react";
import { Mic, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import AudioUploader from "@/components/AudioUploader";
import AudioPlayer from "@/components/AudioPlayer";
import ProgressBar from "@/components/ProgressBar";
import { SUPPORTED_LANGUAGES } from "@/lib/types";
import { cloneVoice } from "@/lib/api";

export default function ClonePage() {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [voiceName, setVoiceName] = useState("");
    const [description, setDescription] = useState("");
    const [language, setLanguage] = useState("English");
    const [tags, setTags] = useState("");
    const [isCloning, setIsCloning] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [statusMessage, setStatusMessage] = useState("");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [cloneProgress, setCloneProgress] = useState(0);

    // Create preview URL when file is selected
    const handleFileSelect = (file: File) => {
        setAudioFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setStatus("idle");
    };

    const handleClear = () => {
        setAudioFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setStatus("idle");
    };

    const handleClone = async () => {
        if (!audioFile || !voiceName.trim()) return;

        setIsCloning(true);
        setStatus("idle");
        setCloneProgress(0);

        try {
            const formData = new FormData();
            formData.append("audio", audioFile);
            formData.append("name", voiceName.trim());
            formData.append("description", description.trim());
            formData.append("language", language);
            formData.append(
                "tags",
                JSON.stringify(
                    tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                )
            );

            await cloneVoice(formData);
            setStatus("success");
            setStatusMessage(`Voice "${voiceName}" cloned and saved successfully!`);

            // Reset form
            setVoiceName("");
            setDescription("");
            setTags("");
            handleClear();
        } catch (err: unknown) {
            setStatus("error");
            const errorMsg = err instanceof Error ? err.message : "Failed to clone voice. Make sure the backend is running.";
            setStatusMessage(errorMsg);
        } finally {
            setCloneProgress(100);
            setTimeout(() => {
                setIsCloning(false);
                setCloneProgress(0);
            }, 500);
        }
    };

    React.useEffect(() => {
        if (isCloning && cloneProgress < 95) {
            const timer = setInterval(() => {
                setCloneProgress(prev => Math.min(prev + Math.random() * 5, 95));
            }, 800);
            return () => clearInterval(timer);
        }
    }, [isCloning, cloneProgress]);

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
                            background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 8px 24px rgba(139, 92, 246, 0.25)",
                        }}
                    >
                        <Mic size={22} color="white" />
                    </div>
                    <div>
                        <h1
                            style={{
                                fontSize: "1.8rem",
                                fontWeight: 800,
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Voice Cloning
                        </h1>
                        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                            Upload a 3–10 second audio sample to clone any voice
                        </p>
                    </div>
                </div>
            </div>

            {/* Upload Section */}
            <div className="glass-card" style={{ padding: "28px", marginBottom: "20px" }}>
                <p className="section-label">Audio Sample</p>
                <p
                    style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                        marginBottom: "16px",
                        lineHeight: 1.5,
                    }}
                >
                    Upload a clear recording of the voice you want to clone. For best
                    results, use 3–10 seconds of clean speech without background noise.
                </p>
                <AudioUploader
                    onFileSelect={handleFileSelect}
                    selectedFile={audioFile}
                    onClear={handleClear}
                />

                {/* Audio Preview */}
                {previewUrl && (
                    <div style={{ marginTop: "16px" }}>
                        <AudioPlayer audioUrl={previewUrl} label="Sample Preview" showDownload={false} />
                    </div>
                )}
            </div>

            {/* Voice Details */}
            <div className="glass-card" style={{ padding: "28px", marginBottom: "20px" }}>
                <p className="section-label">Voice Details</p>

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
                            placeholder="e.g., Morgan's Voice"
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

                <div style={{ marginTop: "16px" }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: "0.82rem",
                            color: "var(--text-secondary)",
                            marginBottom: "6px",
                            fontWeight: 500,
                        }}
                    >
                        Description
                    </label>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="e.g., Deep male voice, calm and authoritative"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div style={{ marginTop: "16px" }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: "0.82rem",
                            color: "var(--text-secondary)",
                            marginBottom: "6px",
                            fontWeight: 500,
                        }}
                    >
                        Tags (comma separated)
                    </label>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="e.g., male, deep, calm, english"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                    />
                </div>
            </div>

            {/* Status Message */}
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
                            color:
                                status === "success" ? "#22c55e" : "#ef4444",
                        }}
                    >
                        {statusMessage}
                    </span>
                </div>
            )}

            {/* Clone Button */}
            <ProgressBar
                progress={cloneProgress}
                isActive={isCloning}
                label={isCloning ? "Extracting voice embedding..." : "Clone complete!"}
                accentColor="#8b5cf6"
                accentColorEnd="#6366f1"
            />

            <button
                className="glow-btn"
                onClick={handleClone}
                disabled={!audioFile || !voiceName.trim() || isCloning}
                style={{
                    width: "100%",
                    padding: "16px",
                    fontSize: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    position: "relative",
                    overflow: "hidden"
                }}
            >
                {isCloning && (
                    <div
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            height: "100%",
                            width: `${Math.round(cloneProgress)}%`,
                            background: "rgba(255, 255, 255, 0.15)",
                            transition: "width 0.5s ease"
                        }}
                    />
                )}
                {isCloning ? (
                    <>
                        <Loader2 size={18} className="pulse-glow" style={{ animation: "pulse-glow 1s ease-in-out infinite" }} />
                        Extracting Voice Embedding... {Math.round(cloneProgress)}%
                    </>
                ) : (
                    <>
                        <Mic size={18} />
                        Clone Voice & Save
                    </>
                )}
            </button>

            {/* Tips */}
            <div
                className="glass-card"
                style={{ padding: "20px 24px", marginTop: "24px" }}
            >
                <p className="section-label">Tips for best results</p>
                <ul
                    style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.8,
                        listStyle: "none",
                        padding: 0,
                    }}
                >
                    {[
                        "Use a quiet environment with no background noise or music",
                        "3–10 seconds of continuous, natural speech works best",
                        "Avoid whispers or shouting — use a normal speaking voice",
                        "Higher quality recordings (WAV, FLAC) produce better clones",
                        "The cloned voice embedding is stored locally on your device",
                    ].map((tip, i) => (
                        <li
                            key={i}
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "8px",
                            }}
                        >
                            <span
                                style={{
                                    color: "var(--accent-purple)",
                                    flexShrink: 0,
                                    marginTop: "2px",
                                }}
                            >
                                •
                            </span>
                            {tip}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
