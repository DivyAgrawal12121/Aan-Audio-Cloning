"use client";

import React, { useState, useEffect } from "react";
import { Languages, Loader2 } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";
import ProgressBar from "@/components/ProgressBar";

const LANGUAGES = ["English", "Hindi", "French", "Spanish", "German", "Japanese", "Chinese", "Korean", "Arabic", "Portuguese", "Italian", "Turkish", "Russian"];

export default function DubbingPage() {
    const [voices, setVoices] = useState<any[]>([]);
    const [selectedVoice, setSelectedVoice] = useState("");
    const [text, setText] = useState("");
    const [sourceLang, setSourceLang] = useState("English");
    const [targetLang, setTargetLang] = useState("Hindi");
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { fetch("http://localhost:8000/api/voices").then(r => r.json()).then(setVoices).catch(() => { }); }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isGenerating) {
            setProgress(0);
            interval = setInterval(() => setProgress(p => {
                if (p < 25) return p + Math.random() * 3;
                if (p < 60) return p + Math.random() * 1.5;
                if (p < 92) return p + Math.random() * 0.6;
                return p;
            }), 500);
        } else if (progress > 0 && !isGenerating) {
            setProgress(100);
            const t = setTimeout(() => setProgress(0), 1500);
            return () => clearTimeout(t);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    const handleDub = async () => {
        if (!selectedVoice || !text.trim()) return;
        setIsGenerating(true); setError(null); setAudioUrl(null);
        try {
            const res = await fetch("http://localhost:8000/api/dubbing", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, voiceId: selectedVoice, sourceLang, targetLang }),
            });
            if (!res.ok) { const data = await res.json(); throw new Error(data.detail || "Dubbing failed"); }
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
                        background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                        boxShadow: "0 8px 24px rgba(59, 130, 246, 0.25)",
                    }}
                >
                    <Languages size={22} color="white" />
                </div>
                <div>
                    <h1>Cross-Lingual Voice Dubbing</h1>
                    <p>
                        Clone your voice and have it speak another language. Requires{" "}
                        <strong style={{ color: "var(--text-primary)" }}>CosyVoice</strong> or{" "}
                        <strong style={{ color: "var(--text-primary)" }}>XTTS v2</strong>.
                    </p>
                </div>
            </div>

            {/* Model Requirement Banner */}
            <div className="feature-banner info">
                <div className="feature-banner-icon" style={{ background: "rgba(59, 130, 246, 0.12)" }}>
                    <Languages size={18} color="#3b82f6" />
                </div>
                <div className="feature-banner-content">
                    <p>
                        This feature requires <strong>CosyVoice</strong> or <strong>XTTS v2</strong> to be loaded.
                        Switch models from the sidebar if you&apos;re using a different engine.
                    </p>
                </div>
            </div>
            <div className="section-card">
                <p className="section-label">Select a Cloned Voice</p>
                <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className="select-field">
                    <option value="">Choose a voice...</option>
                    {voices.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
            </div>

            {/* Language Pair */}
            <div className="section-card">
                <p className="section-label">Language Pair</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 500 }}>
                            Source Language
                        </label>
                        <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} className="select-field">
                            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 500 }}>
                            Target Language
                        </label>
                        <select value={targetLang} onChange={e => setTargetLang(e.target.value)} className="select-field">
                            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Text Input */}
            <div className="section-card">
                <p className="section-label">Text to Speak in Target Language</p>
                <textarea value={text} onChange={e => setText(e.target.value)} rows={4} placeholder="Enter the text..." className="text-area" />
            </div>

            {/* Progress */}
            <ProgressBar
                progress={progress}
                isActive={isGenerating}
                label={isGenerating ? "Dubbing audio with cloned voice..." : "Complete!"}
                accentColor="#3b82f6"
                accentColorEnd="#8b5cf6"
            />

            {/* Generate Button */}
            <button
                onClick={handleDub}
                disabled={isGenerating || !selectedVoice || !text.trim()}
                className="glow-btn"
                style={{
                    width: "100%",
                    padding: "16px",
                    fontSize: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                }}
            >
                {isGenerating ? (
                    <>
                        <Loader2 size={18} className="pulse-glow" style={{ animation: "pulse-glow 1s ease-in-out infinite" }} />
                        Dubbing... {Math.round(progress)}%
                    </>
                ) : (
                    <>
                        <Languages size={18} />
                        Generate Dubbed Audio
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
                    <AudioPlayer audioUrl={audioUrl} label="Dubbed Audio" showDownload />
                </div>
            )}
        </div>
    );
}
