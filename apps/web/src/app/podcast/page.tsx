"use client";

import React, { useState, useEffect } from "react";
import { Podcast, Loader2 } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";
import ProgressBar from "@/components/ProgressBar";

const EXAMPLE_SCRIPT = `A: Welcome to VoxForge Podcast! Today we discuss the future of AI voice technology.
B: Thanks for having me! It's incredible how far voice cloning has come in just the past year.
A: Absolutely. Just two years ago, you needed hours of training data. Now it's three seconds.
B: The implications for content creation are mind-boggling. Podcasters, narrators, game developers...
A: Let's dive into what this means for the industry. What's your take on ethical considerations?
B: That's the big question. I think transparency is key — always disclose when AI voices are used.`;

export default function PodcastPage() {
    const [voices, setVoices] = useState<any[]>([]);
    const [voiceA, setVoiceA] = useState("");
    const [voiceB, setVoiceB] = useState("");
    const [script, setScript] = useState(EXAMPLE_SCRIPT);
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
                if (p < 20) return p + Math.random() * 2.5;
                if (p < 55) return p + Math.random() * 1.2;
                if (p < 85) return p + Math.random() * 0.5;
                if (p < 92) return p + Math.random() * 0.3;
                return p;
            }), 600);
        } else if (progress > 0 && !isGenerating) {
            setProgress(100);
            const t = setTimeout(() => setProgress(0), 1500);
            return () => clearTimeout(t);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    const handleGenerate = async () => {
        if (!voiceA || !voiceB || !script.trim()) return;
        setIsGenerating(true); setError(null); setAudioUrl(null);
        try {
            const res = await fetch("http://localhost:8000/api/podcast", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ script, voiceIdA: voiceA, voiceIdB: voiceB }),
            });
            if (!res.ok) { const data = await res.json(); throw new Error(data.detail || "Generation failed"); }
            const blob = await res.blob();
            setAudioUrl(URL.createObjectURL(blob));
        } catch (e: any) { setError(e.message); }
        finally { setIsGenerating(false); }
    };

    return (
        <div className="page-container-md" style={{ maxWidth: "850px" }}>
            {/* Header */}
            <div className="page-hero">
                <div
                    className="page-hero-badge"
                    style={{
                        background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                        boxShadow: "0 8px 24px rgba(245, 158, 11, 0.25)",
                    }}
                >
                    <Podcast size={22} color="white" />
                </div>
                <div>
                    <h1>Podcast Auto-Generation</h1>
                    <p>
                        Write a two-speaker script and generate a full podcast. Requires{" "}
                        <strong style={{ color: "var(--text-primary)" }}>F5-TTS</strong> or{" "}
                        <strong style={{ color: "var(--text-primary)" }}>Fish Speech</strong>.
                    </p>
                </div>
            </div>

            {/* Model Requirement Banner */}
            <div className="feature-banner warning">
                <div className="feature-banner-icon" style={{ background: "rgba(245, 158, 11, 0.12)" }}>
                    <Podcast size={18} color="#f59e0b" />
                </div>
                <div className="feature-banner-content">
                    <p>
                        This feature requires <strong>F5-TTS</strong> or <strong>Fish Speech</strong> to be loaded.
                        Switch models from the sidebar if you&apos;re using a different engine.
                    </p>
                </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div className="section-card" style={{ marginBottom: 0 }}>
                    <p className="section-label" style={{ color: "#f59e0b" }}>🎤 Speaker A</p>
                    <select value={voiceA} onChange={e => setVoiceA(e.target.value)} className="select-field">
                        <option value="">Select voice...</option>
                        {voices.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
                <div className="section-card" style={{ marginBottom: 0 }}>
                    <p className="section-label" style={{ color: "#ef4444" }}>🎤 Speaker B</p>
                    <select value={voiceB} onChange={e => setVoiceB(e.target.value)} className="select-field">
                        <option value="">Select voice...</option>
                        {voices.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Script Input */}
            <div className="section-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <p className="section-label" style={{ marginBottom: 0 }}>Podcast Script</p>
                    <span style={{
                        fontSize: "0.65rem", color: "var(--text-muted)",
                        background: "rgba(255,255,255,0.04)", padding: "4px 10px", borderRadius: "6px",
                    }}>
                        Prefix lines with &quot;A:&quot; or &quot;B:&quot;
                    </span>
                </div>
                <textarea value={script} onChange={e => setScript(e.target.value)} rows={10} className="text-area"
                    style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: "0.85rem" }} />
            </div>

            {/* Progress */}
            <ProgressBar
                progress={progress}
                isActive={isGenerating}
                label={isGenerating ? "Generating podcast conversation..." : "Complete!"}
                accentColor="#f59e0b"
                accentColorEnd="#ef4444"
            />

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={isGenerating || !voiceA || !voiceB || !script.trim()}
                className="glow-btn"
                style={{
                    width: "100%",
                    padding: "16px",
                    fontSize: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                }}
            >
                {isGenerating ? (
                    <>
                        <Loader2 size={18} className="pulse-glow" style={{ animation: "pulse-glow 1s ease-in-out infinite" }} />
                        Generating Podcast... {Math.round(progress)}%
                    </>
                ) : (
                    <>
                        <Podcast size={18} />
                        Generate Podcast Episode
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
                    <AudioPlayer audioUrl={audioUrl} label="Generated Podcast" showDownload />
                </div>
            )}
        </div>
    );
}
