"use client";

import React, { useState } from "react";
import { Mic, Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { AudioUploader, AudioPlayer, useSimulatedProgress } from "@resound-studio/ui";
import { SUPPORTED_LANGUAGES } from "@resound-studio/shared";
import { cloneVoice } from "@resound-studio/api";

export default function ClonePage() {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [voiceName, setVoiceName] = useState("");
    const [description, setDescription] = useState("");
    const [language, setLanguage] = useState("English");
    const [tags, setTags] = useState("");
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [statusMessage, setStatusMessage] = useState("");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const { progress: cloneProgress, isActive: isCloning, start: startProgress, complete: completeProgress } = useSimulatedProgress();

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

        startProgress();
        setStatus("idle");

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
            const errorMsg = err instanceof Error ? err.message : "Failed to clone voice.";
            setStatusMessage(errorMsg);
        } finally {
            completeProgress();
        }
    };

    return (
        <div className="page-container-sm">
            {/* Header */}
            <div className="page-hero" style={{ marginBottom: "32px" }}>
                <div
                    style={{
                        width: 56, height: 56,
                        background: "var(--accent-purple)",
                        border: "var(--border-thick)",
                        boxShadow: "4px 4px 0px #000",
                        display: "flex", alignItems: "center", justifyContent: "center"
                    }}
                >
                    <Mic size={26} color="black" strokeWidth={3} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>Voice Cloning</h1>
                    <p style={{ fontWeight: 600 }}>Create a digital twin of any voice in seconds.</p>
                </div>
            </div>

            {/* Upload Section */}
            <div className="glass-card" style={{ padding: "28px", marginBottom: "20px" }}>
                <p className="section-label" style={{ color: "#000", fontWeight: 900 }}>Step 1: Audio Sample</p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px", fontWeight: 500 }}>
                    Upload 3-10 seconds of clean speech. Use high-quality audio for better accuracy.
                </p>
                <AudioUploader
                    onFileSelect={handleFileSelect}
                    selectedFile={audioFile}
                    onClear={handleClear}
                />

                {previewUrl && (
                    <div style={{ marginTop: "24px", borderTop: "2px dashed #000", paddingTop: "20px" }}>
                        <AudioPlayer audioUrl={previewUrl} label="SAMPLE PREVIEW" showDownload={false} />
                    </div>
                )}
            </div>

            {/* Voice Details */}
            <div className="section-card" style={{ marginBottom: "20px" }}>
                <p className="section-label" style={{ color: "#000", fontWeight: 900 }}>Step 2: Voice Identity</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "12px" }}>
                    <div>
                        <label className="section-label" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>Voice Name *</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="e.g. Morgan Freeman"
                            value={voiceName}
                            onChange={(e) => setVoiceName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="section-label" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>Base Language</label>
                        <select
                            className="select-field"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                        >
                            {SUPPORTED_LANGUAGES.map((lang) => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ marginTop: "20px" }}>
                    <label className="section-label" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>Description</label>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Deep, gravelly narrator voice..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div style={{ marginTop: "20px" }}>
                    <label className="section-label" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>Tags (Comma Separated)</label>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="male, cinematic, narrator"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                    />
                </div>
            </div>

            {/* Status */}
            {status !== "idle" && (
                <div
                    className="glass-card"
                    style={{
                        padding: "16px",
                        marginBottom: "20px",
                        background: status === "success" ? "var(--accent-green)" : "#fee2e2",
                        display: "flex", alignItems: "center", gap: "10px"
                    }}
                >
                    {status === "success" ? <CheckCircle2 size={20} strokeWidth={3} /> : <AlertCircle size={20} color="#ef4444" strokeWidth={3} />}
                    <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>{statusMessage.toUpperCase()}</span>
                </div>
            )}

            {/* Clone Button */}
            <div style={{ position: "relative", marginBottom: "32px" }}>
                <button
                    className="gen-btn"
                    onClick={handleClone}
                    disabled={!audioFile || !voiceName.trim() || isCloning}
                    style={{
                        width: "100%",
                        padding: "20px",
                        background: isCloning ? "#fff" : "var(--accent-purple)",
                    }}
                >
                    {isCloning ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Loader2 size={20} className="spin" strokeWidth={3} />
                            <span>EXTRACTING... {Math.round(cloneProgress)}%</span>
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Mic size={20} strokeWidth={3} />
                            <span>START CLONING</span>
                        </div>
                    )}
                </button>
                {isCloning && (
                    <div style={{
                        position: "absolute", bottom: "-4px", left: "0", right: "4px", height: "8px",
                        background: "#000", border: "2px solid #000", overflow: "hidden"
                    }}>
                        <div style={{
                            width: `${cloneProgress}%`, height: "100%",
                            background: "var(--accent-pink)",
                            transition: "width 0.3s ease"
                        }} />
                    </div>
                )}
            </div>

            {/* Tips */}
            <div className="section-card" style={{ background: "var(--bg-secondary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <Info size={18} strokeWidth={3} />
                    <p style={{ fontSize: "0.8rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>Pro Cloning Tips</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {[
                        "Use high-quality WAV or FLAC files",
                        "Ensure no background music or static",
                        "3–10 seconds of natural speech is ideal",
                        "High sample rate (44.1kHz+) yields better clones"
                    ].map((tip, i) => (
                        <div key={i} style={{ display: "flex", gap: "10px", alignItems: "start" }}>
                            <div style={{ width: 6, height: 6, background: "#000", marginTop: "6px", flexShrink: 0 }} />
                            <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>{tip}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
