"use client";

import React, { useState, useRef, useEffect } from "react";
import { Eraser, Upload, Loader2, Download } from "lucide-react";
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
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <Eraser size={24} color="#ec4899" />
                    <h1 style={{ background: "linear-gradient(135deg, #ec4899, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Audio In-Painting
                    </h1>
                </div>
                <p>Upload a recording where the speaker stumbled. The AI will seamlessly fix it.</p>
            </div>

            <div className="form-card">
                <label className="form-label">Upload Audio File</label>
                <div onClick={() => fileRef.current?.click()} className={`dropzone ${audioFile ? "has-file" : ""}`} style={{ padding: "28px" }}>
                    <Upload size={22} color="var(--text-muted)" style={{ marginBottom: "6px" }} />
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        {audioFile ? audioFile.name : "Click to upload audio file (.wav, .mp3, .ogg)"}
                    </p>
                    <input ref={fileRef} type="file" accept="audio/*" onChange={handleFileChange} style={{ display: "none" }} />
                </div>
                {previewUrl && (
                    <div style={{ marginTop: "12px" }}>
                        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "6px" }}>Original Audio:</p>
                        <audio src={previewUrl} controls style={{ width: "100%", borderRadius: "8px" }} />
                    </div>
                )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div className="form-card" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: "#ef4444" }}>❌ Original Text (what was said badly)</label>
                    <textarea value={originalText} onChange={e => setOriginalText(e.target.value)} rows={3}
                        placeholder='e.g., I really enj... um... enjoyed the movie' className="text-area" />
                </div>
                <div className="form-card" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: "#22c55e" }}>✅ Corrected Text (what it should say)</label>
                    <textarea value={correctedText} onChange={e => setCorrectedText(e.target.value)} rows={3}
                        placeholder="e.g., I really enjoyed the movie" className="text-area" />
                </div>
            </div>

            <ProgressBar
                progress={progress}
                isActive={isProcessing}
                label={isProcessing ? "In-painting audio segment..." : "Complete!"}
                accentColor="#ec4899"
                accentColorEnd="#8b5cf6"
            />

            <button onClick={handleInpaint} disabled={isProcessing || !audioFile || !originalText.trim() || !correctedText.trim()} className="gen-btn"
                style={{ background: isProcessing ? "rgba(236,72,153,0.3)" : "linear-gradient(135deg, #ec4899, #8b5cf6)" }}>
                <span className="btn-content">
                    {isProcessing ? <><Loader2 size={16} className="spin" /> Processing...</> : <><Eraser size={16} /> Fix Audio</>}
                </span>
            </button>

            {error && <div className="error-box">⚠️ {error}</div>}

            {audioUrl && (
                <div className="result-card">
                    <h3>✨ Corrected Audio</h3>
                    <audio src={audioUrl} controls />
                    <a href={audioUrl} download="inpainted.wav" className="download-link"><Download size={14} /> Download Fixed Audio</a>
                </div>
            )}
        </div>
    );
}
