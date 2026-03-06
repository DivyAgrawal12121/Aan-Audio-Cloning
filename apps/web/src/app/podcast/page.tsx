"use client";

import React, { useState, useEffect } from "react";
import { Podcast, Loader2, Info, Mic2 } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";

const EXAMPLE_SCRIPT = `A: Welcome to VoxForge Podcast! Today we discuss the future of AI voice technology.
B: Thanks for having me! It's incredible how far voice cloning has come in just the past year.
A: Absolutely. Just two years ago, you needed hours of training data. Now it's three seconds.
B: The implications for content creation are mind-boggling. Podcasters, narrators, game developers...`;

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
        if (isGenerating && progress < 95) {
            const timer = setInterval(() => setProgress(p => Math.min(p + Math.random() * 4, 95)), 800);
            return () => clearInterval(timer);
        }
    }, [isGenerating, progress]);

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
        finally { setProgress(100); setTimeout(() => { setIsGenerating(false); setProgress(0); }, 500); }
    };

    return (
        <div className="page-container-md" style={{ maxWidth: "850px" }}>
            {/* Header */}
            <div className="page-hero" style={{ marginBottom: "32px" }}>
                <div style={{ width: 56, height: 56, background: "var(--accent-amber)", border: "var(--border-thick)", boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Podcast size={26} color="black" strokeWidth={3} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>Podcast Studio</h1>
                    <p style={{ fontWeight: 600 }}>Create multi-speaker conversations in seconds.</p>
                </div>
            </div>

            {/* Engine Banner */}
            <div className="section-card" style={{ marginBottom: "20px", background: "var(--bg-secondary)", display: "flex", gap: "12px", alignItems: "start" }}>
                <div style={{ width: 40, height: 40, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Info size={20} color="var(--accent-amber)" strokeWidth={3} />
                </div>
                <div>
                    <p style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "4px" }}>Compatible Models</p>
                    <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>
                        Requires <strong>F5-TTS</strong> or <strong>Fish Speech</strong>. These engines support high-fidelity speech synthesis.
                    </p>
                </div>
            </div>

            {/* Speaker Selection */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div className="section-card" style={{ marginBottom: 0 }}>
                    <p className="section-label" style={{ color: "var(--accent-pink)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Mic2 size={16} strokeWidth={3} /> SPEAKER A
                    </p>
                    <select value={voiceA} onChange={e => setVoiceA(e.target.value)} className="select-field">
                        <option value="">SELECT VOICE...</option>
                        {voices.map((v: any) => <option key={v.id} value={v.id}>{v.name.toUpperCase()}</option>)}
                    </select>
                </div>
                <div className="section-card" style={{ marginBottom: 0 }}>
                    <p className="section-label" style={{ color: "var(--accent-purple)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Mic2 size={16} strokeWidth={3} /> SPEAKER B
                    </p>
                    <select value={voiceB} onChange={e => setVoiceB(e.target.value)} className="select-field">
                        <option value="">SELECT VOICE...</option>
                        {voices.map((v: any) => <option key={v.id} value={v.id}>{v.name.toUpperCase()}</option>)}
                    </select>
                </div>
            </div>

            {/* Script Input */}
            <div className="section-card" style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <p className="section-label" style={{ marginBottom: 0, color: "#000" }}>Podcast Script</p>
                    <span style={{ fontSize: "0.65rem", fontWeight: 900, background: "#000", color: "#fff", padding: "4px 10px" }}>
                        USE "A:" AND "B:" PREFIXES
                    </span>
                </div>
                <textarea
                    value={script}
                    onChange={e => setScript(e.target.value)}
                    rows={8}
                    className="text-area"
                    style={{ fontFamily: "'Courier New', monospace", fontSize: "0.9rem", fontWeight: 700 }}
                />
            </div>

            {/* Action */}
            <div style={{ position: "relative", marginBottom: "32px" }}>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !voiceA || !voiceB || !script.trim()}
                    className="gen-btn"
                    style={{ width: "100%", padding: "20px", background: isGenerating ? "#fff" : "var(--accent-amber)" }}
                >
                    {isGenerating ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Loader2 size={20} className="spin" strokeWidth={3} />
                            <span>RECORDING... {Math.round(progress)}%</span>
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Podcast size={20} strokeWidth={3} />
                            <span>GENERATE FULL EPISODE</span>
                        </div>
                    )}
                </button>
                {isGenerating && (
                    <div style={{ position: "absolute", bottom: "-4px", left: "0", right: "4px", height: "8px", background: "#000", border: "2px solid #000", overflow: "hidden" }}>
                        <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent-pink)", transition: "width 0.3s ease" }} />
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div style={{ padding: "16px", marginBottom: "20px", background: "#fee2e2", border: "var(--border-thin)", boxShadow: "4px 4px 0px #000" }}>
                    <p style={{ fontSize: "0.85rem", fontWeight: 900, color: "#ef4444" }}>⚠️ EXPORT FAILED: {error.toUpperCase()}</p>
                </div>
            )}

            {/* Result */}
            {audioUrl && (
                <div style={{ marginTop: "20px" }}>
                    <AudioPlayer audioUrl={audioUrl} label="MASTERED EPISODE" showDownload />
                </div>
            )}
        </div>
    );
}
