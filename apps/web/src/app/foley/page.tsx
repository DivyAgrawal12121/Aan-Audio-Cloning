"use client";

import React, { useState, useEffect } from "react";
import { Music, Loader2, Wand2 } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";
import ProgressBar from "@/components/ProgressBar";

const PRESETS = [
    "Forest ambiance with birds chirping",
    "Crowd cheering at a stadium",
    "Dog barking aggressively",
    "Thunder with heavy rain",
    "Ocean waves on a beach",
    "Busy cafe with coffee machine",
    "Fire crackling in a fireplace",
    "Spaceship engine humming",
    "Wind howling through a canyon",
    "City traffic sounds",
];

export default function FoleyPage() {
    const [description, setDescription] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isGenerating) {
            setProgress(0);
            interval = setInterval(() => setProgress(p => {
                if (p < 30) return p + Math.random() * 4;
                if (p < 70) return p + Math.random() * 2;
                if (p < 92) return p + Math.random() * 0.8;
                return p;
            }), 400);
        } else if (progress > 0 && !isGenerating) {
            setProgress(100);
            const t = setTimeout(() => setProgress(0), 1500);
            return () => clearTimeout(t);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    const handleGenerate = async () => {
        if (!description.trim()) return;
        setIsGenerating(true);
        setError(null);
        setAudioUrl(null);
        try {
            const res = await fetch("http://localhost:8000/api/foley", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Generation failed");
            }
            const blob = await res.blob();
            setAudioUrl(URL.createObjectURL(blob));
        } catch (e: any) { setError(e.message); }
        finally { setIsGenerating(false); }
    };

    return (
        <div className="page-container-sm">
            {/* Header */}
            <div className="page-hero">
                <div
                    className="page-hero-badge"
                    style={{
                        background: "linear-gradient(135deg, #10b981, #06b6d4)",
                        boxShadow: "0 8px 24px rgba(16, 185, 129, 0.25)",
                    }}
                >
                    <Music size={22} color="white" />
                </div>
                <div>
                    <h1>Sound Effects Studio</h1>
                    <p>
                        Generate any sound effect by describing it. Requires the{" "}
                        <strong style={{ color: "var(--text-primary)" }}>Bark</strong> model.
                    </p>
                </div>
            </div>

            {/* Model Requirement Banner */}
            <div className="feature-banner info">
                <div className="feature-banner-icon" style={{ background: "rgba(16, 185, 129, 0.12)" }}>
                    <Music size={18} color="#10b981" />
                </div>
                <div className="feature-banner-content">
                    <p>
                        This feature requires the <strong>Bark</strong> model to be loaded.
                        Switch models from the sidebar if you&apos;re using a different engine.
                    </p>
                </div>
            </div>
            <div className="section-card">
                <p className="section-label">Describe the sound you want</p>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="e.g., A thunderstorm with heavy rain and distant lightning..."
                    rows={3}
                    className="text-area"
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "14px" }}>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px", width: "100%", fontWeight: 500 }}>
                        Quick presets:
                    </p>
                    {PRESETS.map(p => (
                        <button key={p} onClick={() => setDescription(p)} className="preset-chip">{p}</button>
                    ))}
                </div>
            </div>

            {/* Progress */}
            <ProgressBar
                progress={progress}
                isActive={isGenerating}
                label={isGenerating ? "Generating sound effect..." : "Complete!"}
                accentColor="#10b981"
                accentColorEnd="#06b6d4"
            />

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={isGenerating || !description.trim()}
                className="glow-btn"
                style={{
                    width: "100%",
                    padding: "16px",
                    fontSize: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    background: "linear-gradient(135deg, #10b981, #06b6d4)",
                }}
            >
                {isGenerating ? (
                    <>
                        <Loader2 size={18} className="pulse-glow" style={{ animation: "pulse-glow 1s ease-in-out infinite" }} />
                        Generating... {Math.round(progress)}%
                    </>
                ) : (
                    <>
                        <Wand2 size={18} />
                        Generate Sound Effect
                    </>
                )}
            </button>

            {/* Error */}
            {error && (
                <div className="status-alert error" style={{ marginTop: "16px" }}>
                    <span style={{ fontSize: "0.88rem", color: "#ef4444" }}>⚠️ {error}</span>
                </div>
            )}

            {/* Result */}
            {audioUrl && (
                <div className="result-section">
                    <AudioPlayer audioUrl={audioUrl} label="Generated Sound" showDownload />
                </div>
            )}
        </div>
    );
}
