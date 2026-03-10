"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Volume2,
    Loader2,
    Smile,
    Gauge,
    Timer,
    Plus,
    ChevronDown,
    Wand2,
    Dice5,
} from "lucide-react";
import { AudioPlayer, VoiceCard, useSimulatedProgress } from "@resound-studio/ui";
import {
    SUPPORTED_LANGUAGES,
    EMOTIONS,
    PARALINGUISTICS,
} from "@resound-studio/shared";
import type { SavedVoice, Emotion } from "@resound-studio/shared";
import { generateSpeech, getVoices } from "@resound-studio/api";

export default function GeneratePage() {
    const [text, setText] = useState("");
    const [selectedVoice, setSelectedVoice] = useState<SavedVoice | null>(null);
    const [language, setLanguage] = useState("English");
    const [emotion, setEmotion] = useState<Emotion>("neutral");
    const [speed, setSpeed] = useState(1.0);
    const [pitch, setPitch] = useState(1.0);
    const [duration, setDuration] = useState<number | null>(null);
    const [useDuration, setUseDuration] = useState(false);
    const [style, setStyle] = useState("");
    const [seed, setSeed] = useState<number | null>(null);
    const [useSeed, setUseSeed] = useState(false);
    const [outputUrl, setOutputUrl] = useState<string | null>(null);
    const [voices, setVoices] = useState<SavedVoice[]>([]);
    const [showVoicePicker, setShowVoicePicker] = useState(false);
    const { progress: generationProgress, isActive: isGenerating, start: startProgress, complete: completeProgress } = useSimulatedProgress();

    useEffect(() => {
        loadVoices();
    }, []);

    const loadVoices = async () => {
        try {
            const data = await getVoices();
            setVoices(data);
            if (data.length > 0 && !selectedVoice) setSelectedVoice(data[0]);
        } catch { setVoices([]); }
    };

    const insertParalinguistic = useCallback((tag: string) => {
        setText((prev) => {
            const textarea = document.querySelector("textarea");
            if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                return prev.substring(0, start) + " " + tag + " " + prev.substring(end);
            }
            return prev + " " + tag + " ";
        });
    }, []);

    const handleGenerate = async () => {
        if (!text.trim() || !selectedVoice) return;
        startProgress();
        try {
            const blob = await generateSpeech({
                text: text.trim(),
                voiceId: selectedVoice.id,
                language,
                emotion,
                speed,
                pitch,
                duration: useDuration ? (duration ?? undefined) : undefined,
                style: style || undefined,
                seed: useSeed ? (seed ?? undefined) : undefined,
            });
            if (outputUrl) URL.revokeObjectURL(outputUrl);
            setOutputUrl(URL.createObjectURL(blob));
        } catch (err) { console.error(err); }
        finally {
            completeProgress();
        }
    };

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-hero" style={{ marginBottom: "32px" }}>
                <div style={{ width: 56, height: 56, background: "var(--accent-cyan)", border: "var(--border-thick)", boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Volume2 size={26} color="black" strokeWidth={3} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>Generate Speech</h1>
                    <p style={{ fontWeight: 600 }}>Convert text to ultra-realistic AI speech.</p>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "24px", alignItems: "start" }}>
                {/* Left Column */}
                <div>
                    {/* Voice Selection */}
                    <div className="section-card" style={{ marginBottom: "20px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                            <p className="section-label" style={{ margin: 0, color: "#000" }}>Selected Speaker</p>
                            <button
                                onClick={() => setShowVoicePicker(!showVoicePicker)}
                                style={{ background: "var(--accent-purple)", border: "2px solid #000", padding: "4px 12px", fontSize: "0.75rem", fontWeight: 900, boxShadow: "2px 2px 0px #000", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                            >
                                {showVoicePicker ? "CLOSE" : "PICK VOICE"} <ChevronDown size={14} strokeWidth={3} />
                            </button>
                        </div>

                        {selectedVoice ? (
                            <VoiceCard voice={selectedVoice} isSelected compact />
                        ) : (
                            <div className="glass-card" style={{ padding: "20px", textAlign: "center", background: "var(--bg-secondary)" }}>
                                <p style={{ fontSize: "0.85rem", fontWeight: 700 }}>NONE SELECTED • <a href="/clone" style={{ color: "var(--accent-purple)" }}>CLONE FIRST</a></p>
                            </div>
                        )}

                        {showVoicePicker && voices.length > 0 && (
                            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto", padding: "4px" }}>
                                {voices.map((v) => (
                                    <VoiceCard key={v.id} voice={v} isSelected={selectedVoice?.id === v.id} onSelect={(voice) => { setSelectedVoice(voice); setShowVoicePicker(false); }} compact />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Text Input */}
                    <div className="section-card" style={{ marginBottom: "20px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                            <p className="section-label" style={{ margin: 0, color: "#000" }}>Script / Content</p>
                            <span style={{ fontSize: "0.65rem", fontWeight: 900, background: "#000", color: "#fff", padding: "2px 6px" }}>{text.length}/5000</span>
                        </div>
                        <textarea
                            className="text-area"
                            placeholder="Enter text to speak..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            maxLength={5000}
                            style={{ minHeight: "220px" }}
                        />

                        <div style={{ marginTop: "16px" }}>
                            <p style={{ fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Insert Effects:</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {PARALINGUISTICS.map((tag) => (
                                    <button key={tag} className="tag" onClick={() => insertParalinguistic(tag)} style={{ border: "2px solid #000", cursor: "pointer" }}>
                                        <Plus size={11} strokeWidth={3} /> {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Generate Button Container */}
                    <div style={{ position: "relative", marginBottom: "20px" }}>
                        <button
                            className="gen-btn"
                            onClick={handleGenerate}
                            disabled={!text.trim() || !selectedVoice || isGenerating}
                            style={{ width: "100%", padding: "20px", background: isGenerating ? "#fff" : "var(--accent-cyan)" }}
                        >
                            {isGenerating ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <Loader2 size={20} className="spin" strokeWidth={3} />
                                    <span>SYNTHESIZING... {Math.round(generationProgress)}%</span>
                                </div>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <Wand2 size={20} strokeWidth={3} />
                                    <span>GENERATE SPEECH</span>
                                </div>
                            )}
                        </button>
                        {isGenerating && (
                            <div style={{ position: "absolute", bottom: "-4px", left: "0", right: "4px", height: "8px", background: "#000", border: "2px solid #000", overflow: "hidden" }}>
                                <div style={{ width: `${generationProgress}%`, height: "100%", background: "var(--accent-purple)", transition: "width 0.3s ease" }} />
                            </div>
                        )}
                    </div>

                    <AudioPlayer audioUrl={outputUrl} label="OUTPUT PREVIEW" showDownload channelId={selectedVoice?.channel_id} />
                </div>

                {/* Right Column — Settings */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px", position: "sticky", top: "24px" }}>
                    {/* Emotion */}
                    <div className="section-card" style={{ background: "var(--bg-secondary)" }}>
                        <p className="section-label" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#000" }}>
                            <Smile size={16} strokeWidth={3} /> Emotion
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
                            {EMOTIONS.map((em) => (
                                <button
                                    key={em}
                                    className="tag"
                                    onClick={() => setEmotion(em)}
                                    style={{
                                        justifyContent: "center", border: "2px solid #000", cursor: "pointer",
                                        background: emotion === em ? "var(--accent-pink)" : "#fff",
                                        boxShadow: emotion === em ? "none" : "2px 2px 0px #000",
                                        transform: emotion === em ? "translate(2px, 2px)" : "none"
                                    }}
                                >
                                    {em.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Language Selection */}
                    <div className="section-card">
                        <p className="section-label" style={{ color: "#000" }}>Language</p>
                        <select className="select-field" value={language} onChange={e => setLanguage(e.target.value)}>
                            {SUPPORTED_LANGUAGES.map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                    </div>

                    {/* Speed & Pitch */}
                    <div className="section-card">
                        <p className="section-label" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#000" }}>
                            <Gauge size={16} strokeWidth={3} /> Playback Logic
                        </p>
                        <div style={{ marginTop: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: 900 }}>SPEED: {speed}X</span>
                            </div>
                            <input type="range" className="slider" min="0.5" max="2.0" step="0.1" value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} />
                        </div>
                        <div style={{ marginTop: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: 900 }}>PITCH: {pitch}X</span>
                            </div>
                            <input type="range" className="slider" min="0.5" max="2.0" step="0.1" value={pitch} onChange={e => setPitch(parseFloat(e.target.value))} />
                        </div>
                    </div>

                    {/* Extra Instructions */}
                    <div className="section-card" style={{ background: "var(--accent-amber)" }}>
                        <p className="section-label" style={{ color: "#000" }}>Directives</p>
                        <textarea
                            className="text-area"
                            placeholder="e.g. Speak fast, high energy..."
                            value={style}
                            onChange={(e) => setStyle(e.target.value)}
                            style={{ minHeight: "80px", background: "#fff" }}
                        />
                    </div>

                    {/* Seed Control */}
                    <div className="section-card">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <p className="section-label" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#000", margin: 0 }}>
                                <Dice5 size={16} strokeWidth={3} /> Reproducibility
                            </p>
                            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={useSeed}
                                    onChange={(e) => setUseSeed(e.target.checked)}
                                    style={{ width: 16, height: 16, cursor: "pointer" }}
                                />
                                <span style={{ fontSize: "0.7rem", fontWeight: 900 }}>FIXED SEED</span>
                            </label>
                        </div>
                        {useSeed && (
                            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                                <input
                                    type="number"
                                    className="input-field"
                                    placeholder="42"
                                    value={seed ?? ""}
                                    onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    onClick={() => setSeed(Math.floor(Math.random() * 999999))}
                                    style={{
                                        background: "var(--accent-purple)",
                                        border: "2px solid #000",
                                        padding: "8px 12px",
                                        fontSize: "0.7rem",
                                        fontWeight: 900,
                                        cursor: "pointer",
                                        boxShadow: "2px 2px 0px #000",
                                    }}
                                >
                                    RANDOM
                                </button>
                            </div>
                        )}
                        <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600, marginTop: "6px" }}>
                            Same seed + same text = identical output
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
