"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, Wand2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";
import { SUPPORTED_LANGUAGES } from "@/lib/types";
import { designVoice, previewVoice } from "@/lib/api";

const VOICE_PRESETS = [
    {
        label: "Warm Narrator",
        description: "A mature male voice, warm and deep, like a seasoned audiobook narrator. Calm pacing, rich bass tones.",
    },
    {
        label: "Young Energetic",
        description: "A young, enthusiastic female voice with high energy. Quick pacing, bright and cheerful tone.",
    },
    {
        label: "News Anchor",
        description: "Professional, authoritative mid-range voice. Clear articulation, neutral accent, steady pace.",
    },
    {
        label: "Storyteller",
        description: "A gentle, slightly raspy elderly voice. Slow, measured pacing with dramatic pauses. Warm and wise.",
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
            try {
                const blob = await previewVoice(voice.id);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(URL.createObjectURL(blob));
            } catch { }

            setStatus("success");
            setStatusMessage(`VOICE "${voiceName.toUpperCase()}" CREATED!`);
        } catch (err: unknown) {
            setStatus("error");
            setStatusMessage("DESIGN FAILED. CHECK BACKEND.");
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
            const timer = setInterval(() => setDesignProgress(prev => Math.min(prev + Math.random() * 5, 95)), 800);
            return () => clearInterval(timer);
        }
    }, [isDesigning, designProgress]);

    return (
        <div className="page-container-sm">
            {/* Header */}
            <div className="page-hero" style={{ marginBottom: "32px" }}>
                <div style={{ width: 56, height: 56, background: "var(--accent-pink)", border: "var(--border-thick)", boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Sparkles size={26} color="black" strokeWidth={3} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>Voice Design</h1>
                    <p style={{ fontWeight: 600 }}>Craft unique voices from text descriptions.</p>
                </div>
            </div>

            {/* Design Form */}
            <div className="section-card" style={{ marginBottom: "20px" }}>
                <p className="section-label" style={{ color: "#000" }}>Voice Blueprint</p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px", fontWeight: 500 }}>
                    Describe the timbre, age, and personality of your ideal voice.
                </p>
                <textarea
                    className="text-area"
                    placeholder="e.g., A deep, gravelly male voice from the South. Reassuring and slow..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ minHeight: "140px" }}
                />
            </div>

            {/* Presets */}
            <div className="glass-card" style={{ padding: "24px", marginBottom: "20px", background: "var(--bg-secondary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <Wand2 size={18} color="black" strokeWidth={3} />
                    <p className="section-label" style={{ margin: 0, color: "#000" }}>Inspiration Library</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {VOICE_PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => {
                                setDescription(preset.description);
                                if (!voiceName) setVoiceName(preset.label);
                            }}
                            style={{
                                textAlign: "left",
                                padding: "16px",
                                background: description === preset.description ? "var(--accent-purple)" : "#fff",
                                border: "2px solid #000",
                                boxShadow: description === preset.description ? "none" : "3px 3px 0px #000",
                                transform: description === preset.description ? "translate(3px, 3px)" : "none",
                                cursor: "pointer",
                                transition: "all 0.1s ease",
                            }}
                        >
                            <p style={{ fontWeight: 900, fontSize: "0.85rem", textTransform: "uppercase", marginBottom: "4px" }}>{preset.label}</p>
                            <p style={{ fontSize: "0.7rem", fontWeight: 600, color: description === preset.description ? "rgba(0,0,0,0.8)" : "var(--text-muted)", lineHeight: 1.4 }}>
                                {preset.description.slice(0, 60)}...
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Save Info */}
            <div className="section-card" style={{ marginBottom: "20px" }}>
                <p className="section-label" style={{ color: "#000" }}>Identity</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px" }}>
                    <div>
                        <label className="section-label" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>Voice Name *</label>
                        <input type="text" className="input-field" placeholder="e.g. Cinema King" value={voiceName} onChange={(e) => setVoiceName(e.target.value)} />
                    </div>
                    <div>
                        <label className="section-label" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>Language</label>
                        <select className="select-field" value={language} onChange={(e) => setLanguage(e.target.value)}>
                            {SUPPORTED_LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {previewUrl && (
                <div style={{ marginBottom: "20px" }}>
                    <AudioPlayer audioUrl={previewUrl} label="DESIGN PREVIEW" showDownload={false} />
                </div>
            )}

            {/* Status */}
            {status !== "idle" && (
                <div style={{
                    padding: "16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px",
                    background: status === "success" ? "var(--accent-green)" : "#fee2e2",
                    border: "var(--border-thin)", boxShadow: "4px 4px 0px #000"
                }}>
                    {status === "success" ? <CheckCircle2 size={20} strokeWidth={3} /> : <AlertCircle size={20} color="#ef4444" strokeWidth={3} />}
                    <span style={{ fontSize: "0.85rem", fontWeight: 900 }}>{statusMessage}</span>
                </div>
            )}

            {/* Generate Button */}
            <div style={{ position: "relative", marginBottom: "32px" }}>
                <button
                    className="gen-btn"
                    onClick={handleDesign}
                    disabled={!description.trim() || !voiceName.trim() || isDesigning}
                    style={{ width: "100%", padding: "20px", background: isDesigning ? "#fff" : "var(--accent-pink)" }}
                >
                    {isDesigning ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Loader2 size={20} className="spin" strokeWidth={3} />
                            <span>BRAINSTORMING... {Math.round(designProgress)}%</span>
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Sparkles size={20} strokeWidth={3} />
                            <span>DESIGN & SAVE VOICE</span>
                        </div>
                    )}
                </button>
                {isDesigning && (
                    <div style={{ position: "absolute", bottom: "-4px", left: "0", right: "4px", height: "8px", background: "#000", border: "2px solid #000", overflow: "hidden" }}>
                        <div style={{ width: `${designProgress}%`, height: "100%", background: "var(--accent-amber)", transition: "width 0.3s ease" }} />
                    </div>
                )}
            </div>
        </div>
    );
}
