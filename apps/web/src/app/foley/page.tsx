"use client";

import React, { useState, useEffect } from "react";
import { Music, Loader2, Wand2, Download } from "lucide-react";
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
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <Music size={24} color="#10b981" />
                    <h1 style={{ background: "linear-gradient(135deg, #10b981, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Sound Effects Studio
                    </h1>
                </div>
                <p>Generate any sound effect by describing it. Requires the <strong style={{ color: "var(--text-secondary)" }}>Bark</strong> model.</p>
            </div>

            <div className="form-card">
                <label className="form-label">Describe the sound you want</label>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="e.g., A thunderstorm with heavy rain and distant lightning..."
                    rows={3}
                    className="text-area"
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                    {PRESETS.map(p => (
                        <button key={p} onClick={() => setDescription(p)} className="preset-chip">{p}</button>
                    ))}
                </div>
            </div>

            <ProgressBar
                progress={progress}
                isActive={isGenerating}
                label={isGenerating ? "Generating sound effect..." : "Complete!"}
                accentColor="#10b981"
                accentColorEnd="#06b6d4"
            />

            <button
                onClick={handleGenerate}
                disabled={isGenerating || !description.trim()}
                className="gen-btn"
                style={{ background: isGenerating ? "rgba(16,185,129,0.3)" : "linear-gradient(135deg, #10b981, #06b6d4)" }}
            >
                <span className="btn-content">
                    {isGenerating ? <><Loader2 size={16} className="spin" /> Generating...</> : <><Wand2 size={16} /> Generate Sound Effect</>}
                </span>
            </button>

            {error && <div className="error-box">⚠️ {error}</div>}

            {audioUrl && (
                <div className="result-card">
                    <h3>🔊 Generated Sound</h3>
                    <audio src={audioUrl} controls />
                    <a href={audioUrl} download="foley.wav" className="download-link"><Download size={14} /> Download WAV</a>
                </div>
            )}
        </div>
    );
}
