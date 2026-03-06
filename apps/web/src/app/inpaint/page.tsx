"use client";

import React, { useState, useRef, useEffect } from "react";
import { Eraser, Upload, Loader2, Sparkles, Info } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";

export default function InpaintPage() {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [originalText, setOriginalText] = useState("");
    const [correctedText, setCorrectedText] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isProcessing && progress < 95) {
            const timer = setInterval(() => setProgress(p => Math.min(p + Math.random() * 5, 95)), 800);
            return () => clearInterval(timer);
        }
    }, [isProcessing, progress]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { setAudioFile(file); setPreviewUrl(URL.createObjectURL(file)); }
    };

    const handleInpaint = async () => {
        if (!audioFile || !originalText.trim() || !correctedText.trim()) return;
        setIsProcessing(true); setError(null); setAudioUrl(null);
        const formData = new FormData();
        formData.append("audio", audioFile);
        formData.append("original_text", originalText);
        formData.append("corrected_text", correctedText);
        try {
            const res = await fetch("http://localhost:8000/api/inpaint", { method: "POST", body: formData });
            if (!res.ok) { const data = await res.json(); throw new Error(data.detail || "Inpainting failed"); }
            const blob = await res.blob();
            setAudioUrl(URL.createObjectURL(blob));
        } catch (e: any) { setError(e.message); }
        finally { setProgress(100); setTimeout(() => { setIsProcessing(false); setProgress(0); }, 500); }
    };

    return (
        <div className="page-container-sm">
            {/* Header */}
            <div className="page-hero" style={{ marginBottom: "32px" }}>
                <div style={{ width: 56, height: 56, background: "var(--accent-purple)", border: "var(--border-thick)", boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Eraser size={26} color="black" strokeWidth={3} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>Audio In-Painting</h1>
                    <p style={{ fontWeight: 600 }}>Seamlessly fix audio stumbles or vocal errors.</p>
                </div>
            </div>

            {/* Prototype Banner */}
            <div className="section-card" style={{ marginBottom: "20px", background: "var(--bg-secondary)", border: "3px dashed #000" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <Sparkles size={18} strokeWidth={3} />
                    <p style={{ fontWeight: 900, textTransform: "uppercase" }}>Experimental Feature</p>
                </div>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    Audio in-painting is currently in development. UI is functional, but back-end model support is pending.
                    Stay tuned for the full release!
                </p>
            </div>

            {/* Upload Section */}
            <div className="section-card" style={{ marginBottom: "20px" }}>
                <p className="section-label" style={{ color: "#000" }}>Source Recording</p>
                <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                        border: "3px dashed #000", background: "#fff", padding: "30px",
                        textAlign: "center", cursor: "pointer", transition: "all 0.1s ease"
                    }}
                >
                    <Upload size={24} color="#000" style={{ marginBottom: "12px" }} strokeWidth={3} />
                    <p style={{ fontSize: "0.9rem", fontWeight: 800, textTransform: "uppercase" }}>
                        {audioFile ? audioFile.name : "CLICK TO UPLOAD .WAV / .MP3"}
                    </p>
                    <input ref={fileRef} type="file" accept="audio/*" onChange={handleFileChange} style={{ display: "none" }} />
                </div>
                {previewUrl && (
                    <div style={{ marginTop: "16px" }}>
                        <AudioPlayer audioUrl={previewUrl} label="INPUT PREVIEW" showDownload={false} />
                    </div>
                )}
            </div>

            {/* Text Comparison */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div className="section-card" style={{ marginBottom: 0 }}>
                    <p className="section-label" style={{ color: "#ef4444" }}>STUMBLE SEGMENT</p>
                    <textarea
                        value={originalText} onChange={e => setOriginalText(e.target.value)} rows={3}
                        placeholder='e.g., "I really enj... um... enjoyed..."' className="text-area"
                    />
                </div>
                <div className="section-card" style={{ marginBottom: 0 }}>
                    <p className="section-label" style={{ color: "var(--accent-green)" }}>CORRECTION</p>
                    <textarea
                        value={correctedText} onChange={e => setCorrectedText(e.target.value)} rows={3}
                        placeholder='e.g., "I really enjoyed..."' className="text-area"
                    />
                </div>
            </div>

            {/* Action */}
            <div style={{ position: "relative", marginBottom: "32px" }}>
                <button
                    onClick={handleInpaint}
                    disabled={isProcessing || !audioFile || !originalText.trim() || !correctedText.trim()}
                    className="gen-btn"
                    style={{ width: "100%", padding: "20px", background: isProcessing ? "#fff" : "var(--accent-purple)" }}
                >
                    {isProcessing ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Loader2 size={20} className="spin" strokeWidth={3} />
                            <span>PUNCHING IN... {Math.round(progress)}%</span>
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Eraser size={20} strokeWidth={3} />
                            <span>CLEAN AUDIO SEGMENT</span>
                        </div>
                    )}
                </button>
                {isProcessing && (
                    <div style={{ position: "absolute", bottom: "-4px", left: "0", right: "4px", height: "8px", background: "#000", border: "2px solid #000", overflow: "hidden" }}>
                        <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent-pink)", transition: "width 0.3s ease" }} />
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div style={{ padding: "16px", marginBottom: "20px", background: "#fee2e2", border: "var(--border-thin)", boxShadow: "4px 4px 0px #000" }}>
                    <p style={{ fontSize: "0.85rem", fontWeight: 900, color: "#ef4444" }}>⚠️ REPAIR FAILED: {error.toUpperCase()}</p>
                </div>
            )}

            {/* Result */}
            {audioUrl && (
                <div style={{ marginTop: "20px" }}>
                    <AudioPlayer audioUrl={audioUrl} label="REPAIRED MASTER" showDownload />
                </div>
            )}
        </div>
    );
}
