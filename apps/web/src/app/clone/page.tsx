"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Loader2, CheckCircle2, AlertCircle, Info, FileText, Square, Circle } from "lucide-react";
import { AudioUploader, AudioPlayer, useSimulatedProgress } from "@resound-studio/ui";
import { SUPPORTED_LANGUAGES } from "@resound-studio/shared";
import { cloneVoice } from "@resound-studio/api";
import { useChannels } from "@/hooks/api/useChannels";
import { useServerStore } from "@/stores/useServerStore";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const MIN_RECORD_SECONDS = 30;

export default function ClonePage() {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [voiceName, setVoiceName] = useState("");
    const [description, setDescription] = useState("");
    const [referenceText, setReferenceText] = useState("");
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [language, setLanguage] = useState("English");
    const [tags, setTags] = useState("");
    const [channelId, setChannelId] = useState("");
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [statusMessage, setStatusMessage] = useState("");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const { data: channels = [] } = useChannels();
    const { capabilities, activeModel } = useServerStore();
    const isSupported = capabilities.includes("clone");
    const { progress: cloneProgress, isActive: isCloning, start: startProgress, complete: completeProgress } = useSimulatedProgress();

    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recSeconds, setRecSeconds] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-transcribe helper
    const transcribeFile = useCallback(async (file: File) => {
        setIsTranscribing(true);
        try {
            const formData = new FormData();
            formData.append("audio", file);
            const res = await fetch(`${API_BASE}/api/transcribe`, {
                method: "POST",
                body: formData,
            });
            if (res.ok) {
                const data = await res.json();
                if (data.text) setReferenceText(data.text);
            }
        } catch {
            // Whisper not available
        } finally {
            setIsTranscribing(false);
        }
    }, []);

    // Create preview URL when file is selected
    const handleFileSelect = async (file: File) => {
        setAudioFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setStatus("idle");
        transcribeFile(file);
    };

    // ---- Recording ----
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
            chunksRef.current = [];
            mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                const file = new File([blob], "recorded_voice.webm", { type: "audio/webm" });
                setAudioFile(file);
                setPreviewUrl(URL.createObjectURL(blob));
                setStatus("idle");
                transcribeFile(file);
            };
            mr.start();
            mediaRecorderRef.current = mr;
            setIsRecording(true);
            setRecSeconds(0);
            timerRef.current = setInterval(() => setRecSeconds(prev => prev + 1), 1000);
        } catch {
            setStatus("error");
            setStatusMessage("Microphone access denied. Please allow microphone in your browser settings.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    useEffect(() => {
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    const handleClear = () => {
        setAudioFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setStatus("idle");
    };

    const handleClone = async () => {
        if (!audioFile || !voiceName.trim()) return;

        startProgress();
        setStatus("idle");

        try {
            const formData = new FormData();
            formData.append("audio", audioFile);
            formData.append("name", voiceName.trim());
            formData.append("description", description.trim());
            formData.append("language", language);
            if (channelId) formData.append("channel_id", channelId);
            formData.append("tags",
                JSON.stringify(
                    tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                )
            );
            // Phase 0B: Include reference text for phoneme-aligned cloning
            formData.append("reference_text", referenceText.trim());

            await cloneVoice(formData);
            setStatus("success");
            setStatusMessage(`Voice "${voiceName}" cloned and saved successfully!`);

            // Reset form
            setVoiceName("");
            setDescription("");
            setReferenceText("");
            setTags("");
            setChannelId("");
            handleClear();
        } catch (err: unknown) {
            setStatus("error");
            const errorMsg = err instanceof Error ? err.message : "Failed to clone voice.";
            setStatusMessage(errorMsg);
        } finally {
            completeProgress();
        }
    };

    return (
        <div className="page-container-sm">
            {/* Header */}
            <div className="page-hero" style={{ marginBottom: "32px" }}>
                <div
                    style={{
                        width: 56, height: 56,
                        background: "var(--accent-purple)",
                        border: "var(--border-thick)",
                        boxShadow: "4px 4px 0px #000",
                        display: "flex", alignItems: "center", justifyContent: "center"
                    }}
                >
                    <Mic size={26} color="black" strokeWidth={3} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>Voice Cloning</h1>
                    <p style={{ fontWeight: 600 }}>Create a digital twin of any voice in seconds.</p>
                </div>
            </div>

            {/* Warning Banner */}
            {!isSupported && activeModel && (
                <div style={{ padding: "16px", marginBottom: "20px", background: "#fee2e2", border: "var(--border-thin)", boxShadow: "4px 4px 0px #000", display: "flex", gap: "10px", alignItems: "center" }}>
                    <AlertCircle size={20} color="#ef4444" strokeWidth={3} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#ef4444" }}>WARNING: THE ACTIVE ENGINE ({activeModel.toUpperCase()}) DOES NOT SUPPORT ZERO-SHOT CLONING.</span>
                </div>
            )}

            {/* Upload Section */}
            <div className="glass-card" style={{ padding: "28px", marginBottom: "20px", opacity: !isSupported && activeModel ? 0.6 : 1, pointerEvents: !isSupported && activeModel ? "none" : "auto" }}>
                <p className="section-label" style={{ color: "#000", fontWeight: 900 }}>Step 1: Audio Sample</p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px", fontWeight: 500 }}>
                    Upload or record at least 30 seconds of clean speech. Longer samples = dramatically better cloning quality.
                </p>

                {/* Upload File */}
                <AudioUploader
                    onFileSelect={handleFileSelect}
                    selectedFile={audioFile}
                    onClear={handleClear}
                />

                {/* OR Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "20px 0" }}>
                    <div style={{ flex: 1, height: "2px", background: "#000" }} />
                    <span style={{ fontWeight: 900, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>or record directly</span>
                    <div style={{ flex: 1, height: "2px", background: "#000" }} />
                </div>

                {/* Record Button */}
                {!isRecording ? (
                    <button
                        onClick={startRecording}
                        style={{
                            width: "100%", padding: "20px",
                            background: "#fee2e2", border: "var(--border-thick)",
                            boxShadow: "4px 4px 0px #000", cursor: "pointer",
                            fontWeight: 900, fontSize: "0.9rem", textTransform: "uppercase",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                            transition: "all 0.1s ease",
                        }}
                    >
                        <Circle size={20} fill="#ef4444" color="#ef4444" /> Start Recording (min 30s)
                    </button>
                ) : (
                    <div style={{
                        width: "100%", padding: "20px",
                        background: recSeconds >= MIN_RECORD_SECONDS ? "var(--accent-green)" : "#fef3c7",
                        border: "var(--border-thick)", boxShadow: "4px 4px 0px #000",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{
                                    width: 14, height: 14, borderRadius: "50%", background: "#ef4444",
                                    animation: "pulse 1s ease-in-out infinite",
                                }} />
                                <span style={{ fontWeight: 900, fontSize: "2rem", fontVariantNumeric: "tabular-nums" }}>
                                    {formatTime(recSeconds)}
                                </span>
                                <span style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase" }}>
                                    {recSeconds < MIN_RECORD_SECONDS
                                        ? `${MIN_RECORD_SECONDS - recSeconds}s more needed`
                                        : "✓ Minimum reached — ready to stop"}
                                </span>
                            </div>
                            <button
                                onClick={stopRecording}
                                disabled={recSeconds < MIN_RECORD_SECONDS}
                                style={{
                                    padding: "10px 20px",
                                    background: recSeconds >= MIN_RECORD_SECONDS ? "var(--accent-pink)" : "#ddd",
                                    border: "var(--border-thin)", boxShadow: "3px 3px 0px #000",
                                    fontWeight: 900, fontSize: "0.8rem", cursor: recSeconds >= MIN_RECORD_SECONDS ? "pointer" : "not-allowed",
                                    display: "flex", alignItems: "center", gap: "8px",
                                    textTransform: "uppercase",
                                }}
                            >
                                <Square size={16} fill="#000" /> Stop Recording
                            </button>
                        </div>
                        {/* Progress bar towards 30s */}
                        {recSeconds < MIN_RECORD_SECONDS && (
                            <div style={{ marginTop: "12px", width: "100%", height: "8px", border: "2px solid #000", background: "#fff" }}>
                                <div style={{
                                    width: `${Math.min((recSeconds / MIN_RECORD_SECONDS) * 100, 100)}%`,
                                    height: "100%", background: "var(--accent-amber)", transition: "width 0.5s ease",
                                }} />
                            </div>
                        )}
                    </div>
                )}

                {previewUrl && (
                    <div style={{ marginTop: "24px", borderTop: "2px dashed #000", paddingTop: "20px" }}>
                        <AudioPlayer audioUrl={previewUrl} label="SAMPLE PREVIEW" showDownload={false} />
                    </div>
                )}
            </div>

            {/* Voice Details */}
            <div className="section-card" style={{ marginBottom: "20px" }}>
                <p className="section-label" style={{ color: "#000", fontWeight: 900 }}>Step 2: Voice Identity</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "12px" }}>
                    <div>
                        <label className="section-label" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>Voice Name *</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="e.g. Morgan Freeman"
                            value={voiceName}
                            onChange={(e) => setVoiceName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="section-label" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>Base Language</label>
                        <select
                            className="select-field"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                        >
                            {SUPPORTED_LANGUAGES.map((lang) => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="section-label" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>Audio Channel Routing (Optional)</label>
                        <select
                            className="select-field"
                            value={channelId}
                            onChange={(e) => setChannelId(e.target.value)}
                        >
                            <option value="">Default OS Device</option>
                            {channels.map((ch) => (
                                <option key={ch.id} value={ch.id}>{ch.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Reference Text (Phase 0B) */}
                <div style={{ marginTop: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <label className="section-label" style={{ fontSize: "0.65rem", margin: 0 }}>Reference Text (What is said in the audio)</label>
                        {isTranscribing && (
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent-purple)", display: "flex", alignItems: "center", gap: "4px" }}>
                                <Loader2 size={12} className="spin" />
                                Auto-transcribing...
                            </span>
                        )}
                    </div>
                    <textarea
                        className="input-field"
                        placeholder="Type or auto-transcribe what the speaker says in the audio. This dramatically improves cloning quality by enabling full phoneme alignment."
                        value={referenceText}
                        onChange={(e) => setReferenceText(e.target.value)}
                        rows={3}
                        style={{ resize: "vertical", fontFamily: "inherit" }}
                    />
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, marginTop: "4px" }}>
                        <FileText size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                        Providing the exact transcript enables phoneme-aligned voice cloning (10x better quality).
                    </p>
                </div>

                <div style={{ marginTop: "20px" }}>
                    <label className="section-label" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>Description</label>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Deep, gravelly narrator voice..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div style={{ marginTop: "20px" }}>
                    <label className="section-label" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>Tags (Comma Separated)</label>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="male, cinematic, narrator"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                    />
                </div>
            </div>

            {/* Status */}
            {status !== "idle" && (
                <div
                    className="glass-card"
                    style={{
                        padding: "16px",
                        marginBottom: "20px",
                        background: status === "success" ? "var(--accent-green)" : "#fee2e2",
                        display: "flex", alignItems: "center", gap: "10px"
                    }}
                >
                    {status === "success" ? <CheckCircle2 size={20} strokeWidth={3} /> : <AlertCircle size={20} color="#ef4444" strokeWidth={3} />}
                    <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>{statusMessage.toUpperCase()}</span>
                </div>
            )}

            {/* Clone Button */}
            <div style={{ position: "relative", marginBottom: "32px" }}>
                <button
                    className="gen-btn"
                    onClick={handleClone}
                    disabled={!audioFile || !voiceName.trim() || isCloning}
                    style={{
                        width: "100%",
                        padding: "20px",
                        background: isCloning ? "#fff" : "var(--accent-purple)",
                    }}
                >
                    {isCloning ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Loader2 size={20} className="spin" strokeWidth={3} />
                            <span>EXTRACTING... {Math.round(cloneProgress)}%</span>
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Mic size={20} strokeWidth={3} />
                            <span>START CLONING</span>
                        </div>
                    )}
                </button>
                {isCloning && (
                    <div style={{
                        position: "absolute", bottom: "-4px", left: "0", right: "4px", height: "8px",
                        background: "#000", border: "2px solid #000", overflow: "hidden"
                    }}>
                        <div style={{
                            width: `${cloneProgress}%`, height: "100%",
                            background: "var(--accent-pink)",
                            transition: "width 0.3s ease"
                        }} />
                    </div>
                )}
            </div>

            {/* Tips */}
            <div className="section-card" style={{ background: "var(--bg-secondary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <Info size={18} strokeWidth={3} />
                    <p style={{ fontSize: "0.8rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>Pro Cloning Tips</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {[
                        "Upload 10–30 seconds of clean speech for best results",
                        "Ensure no background music, noise, or static",
                        "ALWAYS provide the reference text — it's the #1 quality boost",
                        "Multiple samples per voice improve cloning fidelity",
                        "High sample rate (44.1kHz+) yields better clones",
                    ].map((tip, i) => (
                        <div key={i} style={{ display: "flex", gap: "10px", alignItems: "start" }}>
                            <div style={{ width: 6, height: 6, background: "#000", marginTop: "6px", flexShrink: 0 }} />
                            <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>{tip}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
