"use client";

import React, { useState, useRef, useEffect } from "react";
import { Eraser, Upload, Loader2, Sparkles } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";
import ProgressBar from "@/components/ProgressBar";

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
        let interval: NodeJS.Timeout;
        if (isProcessing) {
            setProgress(0);
            interval = setInterval(() => setProgress(p => {
                if (p < 30) return p + Math.random() * 4;
                if (p < 65) return p + Math.random() * 1.8;
                if (p < 92) return p + Math.random() * 0.7;
                return p;
            }), 400);
        } else if (progress > 0 && !isProcessing) {
            setProgress(100);
            const t = setTimeout(() => setProgress(0), 1500);
            return () => clearTimeout(t);
        }
        return () => clearInterval(interval);
    }, [isProcessing]);

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
        finally { setIsProcessing(false); }
    };

    return (
        <div className="page-container-sm">
            {/* Header */}
            <div className="page-hero">
                <div
                    className="page-hero-badge"
                    style={{
                        background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                        boxShadow: "0 8px 24px rgba(236, 72, 153, 0.25)",
                    }}
                >
                    <Eraser size={22} color="white" />
                </div>
                <div>
                    <h1>Audio In-Painting</h1>
                    <p>Upload a recording where the speaker stumbled. The AI will seamlessly fix it.</p>
                </div>
            </div>

            {/* Coming Soon Banner */}
            <div className="coming-soon-banner">
                <span className="coming-soon-badge">
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Sparkles size={12} /> Coming Soon
                    </span>
                </span>
                <p>
                    Audio in-painting is actively being developed. No engine currently supports this feature —
                    once a compatible model is added, this page will be fully functional. The UI is ready for when it ships!
                </p>
            </div>

            {/* Upload Section */}
            <div className="section-card">
                <p className="section-label">Upload Audio File</p>
                <div onClick={() => fileRef.current?.click()} className={`dropzone ${audioFile ? "has-file" : ""}`} style={{ padding: "28px" }}>
                    <Upload size={22} color="var(--text-muted)" style={{ marginBottom: "6px" }} />
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        {audioFile ? audioFile.name : "Click to upload audio file (.wav, .mp3, .ogg)"}
                    </p>
                    <input ref={fileRef} type="file" accept="audio/*" onChange={handleFileChange} style={{ display: "none" }} />
                </div>
                {previewUrl && (
                    <div style={{ marginTop: "16px" }}>
                        <AudioPlayer audioUrl={previewUrl} label="Original Audio" showDownload={false} />
                    </div>
                )}
            </div>

            {/* Text Comparison */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div className="section-card" style={{ marginBottom: 0 }}>
                    <p className="section-label" style={{ color: "#ef4444" }}>❌ Original Text (what was said badly)</p>
                    <textarea value={originalText} onChange={e => setOriginalText(e.target.value)} rows={3}
                        placeholder='e.g., I really enj... um... enjoyed the movie' className="text-area" />
                </div>
                <div className="section-card" style={{ marginBottom: 0 }}>
                    <p className="section-label" style={{ color: "#22c55e" }}>✅ Corrected Text (what it should say)</p>
                    <textarea value={correctedText} onChange={e => setCorrectedText(e.target.value)} rows={3}
                        placeholder="e.g., I really enjoyed the movie" className="text-area" />
                </div>
            </div>

            {/* Progress */}
            <ProgressBar
                progress={progress}
                isActive={isProcessing}
                label={isProcessing ? "In-painting audio segment..." : "Complete!"}
                accentColor="#ec4899"
                accentColorEnd="#8b5cf6"
            />

            {/* Generate Button */}
            <button
                onClick={handleInpaint}
                disabled={isProcessing || !audioFile || !originalText.trim() || !correctedText.trim()}
                className="glow-btn"
                style={{
                    width: "100%",
                    padding: "16px",
                    fontSize: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                }}
            >
                {isProcessing ? (
                    <>
                        <Loader2 size={18} className="pulse-glow" style={{ animation: "pulse-glow 1s ease-in-out infinite" }} />
                        Processing... {Math.round(progress)}%
                    </>
                ) : (
                    <>
                        <Eraser size={18} />
                        Fix Audio
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
                    <AudioPlayer audioUrl={audioUrl} label="Corrected Audio" showDownload />
                </div>
            )}
        </div>
    );
}
