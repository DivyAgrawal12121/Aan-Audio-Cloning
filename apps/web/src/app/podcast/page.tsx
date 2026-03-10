"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic2, Plus, Trash2, Loader2, Play, Download, UserCircle2, GripVertical, Settings2, Users } from "lucide-react";
import { AudioPlayer } from "@resound-studio/ui";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface Voice {
    id: string;
    name: string;
    description?: string;
    tags?: string[];
}

interface PodcastBlock {
    id: string;
    speaker_id: string; // References SpeakerConfig.id
    text: string;
}

interface SpeakerConfig {
    id: string;
    label: string; // e.g. "Speaker 1"
    voice_id: string;
}

const SPEAKER_COLORS = [
    "var(--accent-purple)",
    "var(--accent-cyan)",
    "var(--accent-pink)",
    "var(--accent-amber)",
    "var(--accent-green)",
    "#8b5cf6",
    "#06b6d4",
    "#f43f5e",
];

let blockCounter = 0;
function newBlock(speakerId: string = ""): PodcastBlock {
    return { id: `block-${++blockCounter}`, speaker_id: speakerId, text: "" };
}

export default function PodcastStudioPage() {
    const [voices, setVoices] = useState<Voice[]>([]);
    const [speakers, setSpeakers] = useState<SpeakerConfig[]>([
        { id: "s1", label: "Speaker 1", voice_id: "" },
        { id: "s2", label: "Speaker 2", voice_id: "" }
    ]);
    const [blocks, setBlocks] = useState<PodcastBlock[]>([]);
    const [podcastName, setPodcastName] = useState("My Podcast Studio");
    const [language, setLanguage] = useState("English");
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [step, setStep] = useState<"setup" | "script">("setup");

    // Fetch available voices
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/voices`);
                if (res.ok) setVoices(await res.json());
            } catch { /* ignore */ }
        })();
    }, []);

    const addSpeaker = () => {
        const id = `s${speakers.length + 1}`;
        setSpeakers(prev => [...prev, { id, label: `Speaker ${speakers.length + 1}`, voice_id: "" }]);
    };

    const removeSpeaker = (id: string) => {
        if (speakers.length <= 1) return;
        setSpeakers(prev => prev.filter(s => s.id !== id));
        setBlocks(prev => prev.filter(b => b.speaker_id !== id));
    };

    const updateSpeakerVoice = (id: string, voiceId: string) => {
        setSpeakers(prev => prev.map(s => s.id === id ? { ...s, voice_id: voiceId } : s));
    };

    const addBlock = () => {
        setBlocks(prev => [...prev, newBlock(speakers[0]?.id || "")]);
    };

    const removeBlock = (id: string) => {
        setBlocks(prev => prev.filter(b => b.id !== id));
    };

    const updateBlock = (id: string, field: keyof PodcastBlock, value: string) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const getSpeakerVoiceName = (speakerId: string) => {
        const s = speakers.find(sp => sp.id === speakerId);
        if (!s) return "Unknown";
        return voices.find(v => v.id === s.voice_id)?.name || "Unassigned";
    };

    const getSpeakerColor = (speakerId: string) => {
        const idx = speakers.findIndex(s => s.id === speakerId);
        return SPEAKER_COLORS[idx % SPEAKER_COLORS.length] || "#ddd";
    };

    const canProceedToScript = speakers.every(s => s.voice_id) && speakers.length > 0;
    const canGenerate = blocks.every(b => b.speaker_id && b.text.trim()) && blocks.length > 0 && !isGenerating;

    const handleGenerate = async () => {
        if (!canGenerate) return;
        setIsGenerating(true);
        setError("");
        setResultUrl(null);
        setProgress(0);

        const interval = setInterval(() => {
            setProgress(prev => Math.min(prev + 1, 95));
        }, 800);

        try {
            // Map blocks to the backend format
            // Backend expects blocks to have: voice_id, text
            const payload = {
                story_name: podcastName,
                language,
                blocks: blocks.map(b => {
                    const speaker = speakers.find(s => s.id === b.speaker_id);
                    return {
                        voice_id: speaker?.voice_id || "",
                        text: b.text,
                    };
                }),
            };

            const res = await fetch(`${API_BASE}/api/podcast`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Generation failed" }));
                throw new Error(err.detail || "Failed to generate podcast");
            }

            const blob = await res.blob();
            setResultUrl(URL.createObjectURL(blob));
            setProgress(100);
        } catch (e: any) {
            setError(e.message || "Failed to generate podcast");
        } finally {
            clearInterval(interval);
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!resultUrl) return;
        const a = document.createElement("a");
        a.href = resultUrl;
        a.download = `${podcastName.replace(/\s+/g, "_")}.wav`;
        a.click();
    };

    return (
        <div className="page-container" style={{ padding: "40px", maxWidth: "1000px", margin: "0 auto" }}>
            {/* Header */}
            <header style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <div style={{
                        width: 64, height: 64, background: "var(--accent-pink)",
                        border: "var(--border-thick)", display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "6px 6px 0px #000"
                    }}>
                        <Mic2 size={32} color="black" strokeWidth={3} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: "2.25rem", fontWeight: 900, letterSpacing: "-0.02em" }}>Podcast Studio</h1>
                        <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                            <div style={{
                                padding: "4px 12px", background: step === "setup" ? "#000" : "#eee",
                                color: step === "setup" ? "#fff" : "#000", fontSize: "0.7rem", fontWeight: 900,
                                border: "1px solid #000", cursor: "pointer"
                            }} onClick={() => setStep("setup")}>
                                STEP 1: SPEAKERS
                            </div>
                            <div style={{
                                padding: "4px 12px", background: step === "script" ? "#000" : "#eee",
                                color: step === "script" ? "#fff" : "#000", fontSize: "0.7rem", fontWeight: 900,
                                border: "1px solid #000", cursor: canProceedToScript ? "pointer" : "not-allowed"
                            }} onClick={() => canProceedToScript && setStep("script")}>
                                STEP 2: SCRIPT
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {step === "setup" ? (
                <div className="setup-flow">
                    <div className="section-card" style={{ marginBottom: "24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                            <div>
                                <h2 style={{ fontSize: "1.25rem", fontWeight: 900 }}>Speaker Configuration</h2>
                                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>Choose your voices for this podcast.</p>
                            </div>
                            <button onClick={addSpeaker} className="gen-btn" style={{ background: "var(--accent-cyan)", padding: "10px 20px", fontSize: "0.8rem" }}>
                                <Plus size={16} strokeWidth={3} /> ADD SPEAKER
                            </button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                            {speakers.map((s, idx) => (
                                <div key={s.id} style={{
                                    border: "var(--border-thick)", boxShadow: "4px 4px 0px #000",
                                    padding: "20px", background: "#fff", position: "relative"
                                }}>
                                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, background: SPEAKER_COLORS[idx % SPEAKER_COLORS.length] }} />
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                        <span style={{ fontWeight: 900, fontSize: "0.8rem" }}>{s.label}</span>
                                        <button onClick={() => removeSpeaker(s.id)} style={{ padding: 4, background: "transparent", color: "#666", cursor: "pointer" }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <select
                                        className="select-field"
                                        value={s.voice_id}
                                        onChange={(e) => updateSpeakerVoice(s.id, e.target.value)}
                                        style={{ fontSize: "0.85rem", fontWeight: 700 }}
                                    >
                                        <option value="">— Select Voice —</option>
                                        {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="section-card">
                        <label className="section-label">General Settings</label>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginTop: "12px" }}>
                            <input className="input-field" value={podcastName} onChange={e => setPodcastName(e.target.value)} placeholder="Podcast Name" />
                            <select className="select-field" value={language} onChange={e => setLanguage(e.target.value)}>
                                {["English", "Hindi", "French", "German", "Spanish", "Japanese", "Korean", "Chinese"].map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                    </div>

                    <button
                        className="gen-btn"
                        disabled={!canProceedToScript}
                        onClick={() => setStep("script")}
                        style={{ width: "100%", marginTop: "24px", padding: 20, background: canProceedToScript ? "var(--accent-green)" : "#ccc" }}
                    >
                        NEXT: WRITE SCRIPT
                    </button>
                </div>
            ) : (
                <div className="script-flow">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 900 }}>Script Editor</h2>
                        <button onClick={addBlock} className="gen-btn" style={{ background: "var(--accent-purple)", padding: "10px 20px", fontSize: "0.8rem" }}>
                            <Plus size={16} strokeWidth={3} /> ADD SEQUENCE
                        </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
                        {blocks.length === 0 && (
                            <div style={{ textAlign: "center", padding: "40px", border: "2px dashed #ccc", background: "#f9f9f9" }}>
                                <p style={{ fontWeight: 700, color: "#999" }}>Your script is empty. Click 'Add Sequence' to start.</p>
                            </div>
                        )}
                        {blocks.map((b, idx) => (
                            <div key={b.id} style={{ display: "flex", gap: "20px", background: "#fff", border: "var(--border-thick)", boxShadow: "6px 6px 0px #000", padding: 20 }}>
                                <div style={{ width: 150, flexShrink: 0 }}>
                                    <label style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Speaker</label>
                                    <select
                                        className="select-field"
                                        value={b.speaker_id}
                                        onChange={e => updateBlock(b.id, "speaker_id", e.target.value)}
                                        style={{ fontSize: "0.8rem", height: 36, borderColor: getSpeakerColor(b.speaker_id) }}
                                    >
                                        {speakers.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                    </select>
                                    <div style={{ marginTop: 8, fontSize: "0.75rem", fontWeight: 800, color: getSpeakerColor(b.speaker_id) }}>
                                        {getSpeakerVoiceName(b.speaker_id)}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Dialogue Sequence</label>
                                    <textarea
                                        className="input-field"
                                        rows={3}
                                        value={b.text}
                                        onChange={e => updateBlock(b.id, "text", e.target.value)}
                                        placeholder="What should this speaker say?"
                                        style={{ fontStyle: "italic" }}
                                    />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                    <button onClick={() => removeBlock(b.id)} style={{ padding: 8, background: "#fee2e2", border: "1px solid #000", cursor: "pointer" }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ position: "sticky", bottom: 40 }}>
                        {error && <div style={{ background: "#fee2e2", padding: 16, border: "2px solid #000", marginBottom: 16, fontWeight: 900, fontSize: "0.8rem", color: "#ef4444" }}>{error}</div>}

                        <button
                            className="gen-btn"
                            disabled={!canGenerate || isGenerating}
                            onClick={handleGenerate}
                            style={{ width: "100%", padding: 24, fontSize: "1.2rem", background: canGenerate ? "var(--accent-pink)" : "#ccc" }}
                        >
                            {isGenerating ? (
                                <span style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center" }}>
                                    <Loader2 size={24} className="spin" /> EXPORTING CONVERSATION... {Math.round(progress)}%
                                </span>
                            ) : (
                                <span style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center" }}>
                                    <Play size={24} fill="#000" /> GENERATE COMPLETE PODCAST
                                </span>
                            )}
                        </button>

                        {isGenerating && (
                            <div style={{ height: 8, background: "#eee", border: "2px solid #000", marginTop: 8 }}>
                                <div style={{ height: "100%", background: "var(--accent-pink)", width: `${progress}%`, transition: "width 0.5s ease" }} />
                            </div>
                        )}
                    </div>

                    {resultUrl && (
                        <div className="section-card" style={{ marginTop: 40, background: "var(--bg-secondary)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <h3 style={{ fontWeight: 900 }}>PODCAST MASTER OUTPUT</h3>
                                <button onClick={handleDownload} className="gen-btn" style={{ background: "var(--accent-cyan)", padding: "10px 20px" }}>
                                    <Download size={18} /> DOWNLOAD .WAV
                                </button>
                            </div>
                            <AudioPlayer audioUrl={resultUrl} label={podcastName} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
