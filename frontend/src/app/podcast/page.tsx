"use client";

import React, { useState, useEffect } from "react";
import { Podcast, Loader2, Download } from "lucide-react";
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
        <div style={{ maxWidth: 850, margin: "0 auto" }}>
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <Podcast size={24} color="#f59e0b" />
                    <h1 style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Podcast Auto-Generation
                    </h1>
                </div>
                <p>Write a two-speaker script and generate a full podcast. Requires <strong style={{ color: "var(--text-secondary)" }}>F5-TTS</strong> or <strong style={{ color: "var(--text-secondary)" }}>Fish Speech</strong>.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div className="form-card" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: "#f59e0b" }}>🎤 Speaker A</label>
                    <select value={voiceA} onChange={e => setVoiceA(e.target.value)} className="select-field">
                        <option value="">Select voice...</option>
                        {voices.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
                <div className="form-card" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: "#ef4444" }}>🎤 Speaker B</label>
                    <select value={voiceB} onChange={e => setVoiceB(e.target.value)} className="select-field">
                        <option value="">Select voice...</option>
                        {voices.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="form-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Podcast Script</label>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.04)", padding: "3px 8px", borderRadius: "6px" }}>
                        Prefix lines with &quot;A:&quot; or &quot;B:&quot;
                    </span>
                </div>
                <textarea value={script} onChange={e => setScript(e.target.value)} rows={10} className="text-area"
                    style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: "0.85rem" }} />
            </div>

            <ProgressBar
                progress={progress}
                isActive={isGenerating}
                label={isGenerating ? "Generating podcast conversation..." : "Complete!"}
                accentColor="#f59e0b"
                accentColorEnd="#ef4444"
            />

            <button onClick={handleGenerate} disabled={isGenerating || !voiceA || !voiceB || !script.trim()} className="gen-btn"
                style={{ background: isGenerating ? "rgba(245,158,11,0.3)" : "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
                <span className="btn-content">
                    {isGenerating ? <><Loader2 size={16} className="spin" /> Generating Podcast...</> : <><Podcast size={16} /> Generate Podcast Episode</>}
                </span>
            </button>

            {error && <div className="error-box">⚠️ {error}</div>}

            {audioUrl && (
                <div className="result-card">
                    <h3>🎙️ Generated Podcast</h3>
                    <audio src={audioUrl} controls />
                    <a href={audioUrl} download="podcast.wav" className="download-link"><Download size={14} /> Download Episode</a>
                </div>
            )}
        </div>
    );
}
