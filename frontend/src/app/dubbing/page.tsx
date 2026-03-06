"use client";

import React, { useState, useEffect } from "react";
import { Languages, Loader2, Download } from "lucide-react";
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
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <Languages size={24} color="#3b82f6" />
                    <h1 style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Cross-Lingual Voice Dubbing
                    </h1>
                </div>
                <p>Clone your voice and have it speak another language. Requires <strong style={{ color: "var(--text-secondary)" }}>CosyVoice</strong> or <strong style={{ color: "var(--text-secondary)" }}>XTTS v2</strong>.</p>
            </div>

            <div className="form-card">
                <label className="form-label">Select a Cloned Voice</label>
                <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className="select-field" style={{ marginBottom: "16px" }}>
                    <option value="">Choose a voice...</option>
                    {voices.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                    <div>
                        <label className="form-label">Source Language</label>
                        <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} className="select-field">
                            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label">Target Language</label>
                        <select value={targetLang} onChange={e => setTargetLang(e.target.value)} className="select-field">
                            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                </div>

                <label className="form-label">Text to Speak in Target Language</label>
                <textarea value={text} onChange={e => setText(e.target.value)} rows={4} placeholder="Enter the text..." className="text-area" />
            </div>

            <ProgressBar
                progress={progress}
                isActive={isGenerating}
                label={isGenerating ? "Dubbing audio with cloned voice..." : "Complete!"}
                accentColor="#3b82f6"
                accentColorEnd="#8b5cf6"
            />

            <button onClick={handleDub} disabled={isGenerating || !selectedVoice || !text.trim()} className="gen-btn"
                style={{ background: isGenerating ? "rgba(59,130,246,0.3)" : "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
                <span className="btn-content">
                    {isGenerating ? <><Loader2 size={16} className="spin" /> Dubbing...</> : <><Languages size={16} /> Generate Dubbed Audio</>}
                </span>
            </button>

            {error && <div className="error-box">⚠️ {error}</div>}

            {audioUrl && (
                <div className="result-card">
                    <h3>🌐 Dubbed Audio</h3>
                    <audio src={audioUrl} controls />
                    <a href={audioUrl} download="dubbed.wav" className="download-link"><Download size={14} /> Download WAV</a>
                </div>
            )}
        </div>
    );
}
