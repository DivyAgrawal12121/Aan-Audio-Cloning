"use client";

import React, { useState, useEffect } from "react";
import { Languages, Loader2, Info } from "lucide-react";
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
        if (isGenerating && progress < 95) {
            const timer = setInterval(() => setProgress(p => Math.min(p + Math.random() * 5, 95)), 800);
            return () => clearInterval(timer);
        }
    }, [isGenerating, progress]);

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
        finally { setProgress(100); setTimeout(() => { setIsGenerating(false); setProgress(0); }, 500); }
    };

    return (
        <div className="page-container-sm">
            {/* Header */}
            <div className="page-hero" style={{ marginBottom: "32px" }}>
                <div style={{ width: 56, height: 56, background: "var(--accent-cyan)", border: "var(--border-thick)", boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Languages size={26} color="black" strokeWidth={3} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>Voice Dubbing</h1>
                    <p style={{ fontWeight: 600 }}>Clone your voice into another language seamlessly.</p>
                </div>
            </div>

            {/* Model Requirement Banner */}
            <div className="section-card" style={{ marginBottom: "20px", background: "var(--bg-secondary)", display: "flex", gap: "12px", alignItems: "start" }}>
                <div style={{ width: 40, height: 40, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Info size={20} color="var(--accent-cyan)" strokeWidth={3} />
                </div>
                <div>
                    <p style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "4px" }}>Engine Requirement</p>
                    <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>
                        Requires <strong>CosyVoice</strong> or <strong>XTTS v2</strong>. Switch engines in the sidebar if needed.
                    </p>
                </div>
            </div>

            <div className="section-card" style={{ marginBottom: "20px" }}>
                <p className="section-label" style={{ color: "#000" }}>Target Speaker</p>
                <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className="select-field">
                    <option value="">CHOOSE A CLONED VOICE...</option>
                    {voices.map((v: any) => <option key={v.id} value={v.id}>{v.name.toUpperCase()}</option>)}
                </select>
            </div>

            {/* Language Pair */}
            <div className="section-card" style={{ marginBottom: "20px" }}>
                <p className="section-label" style={{ color: "#000" }}>Translation Route</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px" }}>
                    <div>
                        <label className="section-label" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>Source Lang</label>
                        <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} className="select-field">
                            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="section-label" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>Target Lang</label>
                        <select value={targetLang} onChange={e => setTargetLang(e.target.value)} className="select-field">
                            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Text Input */}
            <div className="section-card" style={{ marginBottom: "20px" }}>
                <p className="section-label" style={{ color: "#000" }}>Script to Translate</p>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={4}
                    placeholder="ENTER TEXT HERE..."
                    className="text-area"
                />
            </div>

            {/* Action */}
            <div style={{ position: "relative", marginBottom: "32px" }}>
                <button
                    onClick={handleDub}
                    disabled={isGenerating || !selectedVoice || !text.trim()}
                    className="gen-btn"
                    style={{ width: "100%", padding: "20px", background: isGenerating ? "#fff" : "var(--accent-purple)" }}
                >
                    {isGenerating ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Loader2 size={20} className="spin" strokeWidth={3} />
                            <span>TRANSLATING... {Math.round(progress)}%</span>
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Languages size={20} strokeWidth={3} />
                            <span>GENERATE DUBBED AUDIO</span>
                        </div>
                    )}
                </button>
                {isGenerating && (
                    <div style={{ position: "absolute", bottom: "-4px", left: "0", right: "4px", height: "8px", background: "#000", border: "2px solid #000", overflow: "hidden" }}>
                        <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent-cyan)", transition: "width 0.3s ease" }} />
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div style={{ padding: "16px", marginBottom: "20px", background: "#fee2e2", border: "var(--border-thin)", boxShadow: "4px 4px 0px #000" }}>
                    <p style={{ fontSize: "0.85rem", fontWeight: 900, color: "#ef4444" }}>⚠️ ERROR: {error.toUpperCase()}</p>
                </div>
            )}

            {/* Result */}
            {audioUrl && (
                <div style={{ marginTop: "20px" }}>
                    <AudioPlayer audioUrl={audioUrl} label="DUBBED OUTPUT" showDownload />
                </div>
            )}
        </div>
    );
}
