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
} from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";
import VoiceCard from "@/components/VoiceCard";
import ProgressBar from "@/components/ProgressBar";
import {
    SUPPORTED_LANGUAGES,
    EMOTIONS,
    PARALINGUISTICS,
} from "@/lib/types";
import type { SavedVoice, Emotion } from "@/lib/types";
import { generateSpeech, getVoices } from "@/lib/api";

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
    const [isGenerating, setIsGenerating] = useState(false);
    const [outputUrl, setOutputUrl] = useState<string | null>(null);
    const [voices, setVoices] = useState<SavedVoice[]>([]);
    const [showVoicePicker, setShowVoicePicker] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);

    useEffect(() => {
        loadVoices();
    }, []);

    const loadVoices = async () => {
        try {
            const data = await getVoices();
            setVoices(data);
            if (data.length > 0 && !selectedVoice) {
                setSelectedVoice(data[0]);
            }
        } catch {
            // Backend not available — use demo data
            setVoices([]);
        }
    };

    const insertParalinguistic = useCallback(
        (tag: string) => {
            setText((prev) => {
                const textarea = document.querySelector("textarea");
                if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    return prev.substring(0, start) + " " + tag + " " + prev.substring(end);
                }
                return prev + " " + tag + " ";
            });
        },
        []
    );

    const handleGenerate = async () => {
        if (!text.trim() || !selectedVoice) return;

        setIsGenerating(true);
        setGenerationProgress(0);
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
            });

            if (outputUrl) URL.revokeObjectURL(outputUrl);
            setOutputUrl(URL.createObjectURL(blob));
        } catch (err) {
            console.error("Generation failed:", err);
        } finally {
            setGenerationProgress(100);
            setTimeout(() => {
                setIsGenerating(false);
                setGenerationProgress(0);
            }, 500);
        }
    };

    useEffect(() => {
        if (isGenerating && generationProgress < 95) {
            const timer = setInterval(() => {
                setGenerationProgress(prev => {
                    const diff = Math.random() * 5;
                    return Math.min(prev + diff, 95);
                });
            }, 800);
            return () => clearInterval(timer);
        }
    }, [isGenerating, generationProgress]);

    const charCount = text.length;

    return (
        <div className="page-container">
            {/* Header */}
            <div style={{ marginBottom: "36px" }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        marginBottom: "12px",
                    }}
                >
                    <div
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: "14px",
                            background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 8px 24px rgba(6, 182, 212, 0.25)",
                        }}
                    >
                        <Volume2 size={22} color="white" />
                    </div>
                    <div>
                        <h1
                            style={{
                                fontSize: "1.8rem",
                                fontWeight: 800,
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Generate Speech
                        </h1>
                        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                            Convert text to ultra-realistic speech with full control
                        </p>
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 340px",
                    gap: "24px",
                    alignItems: "start",
                }}
            >
                {/* Left Column — Main Controls */}
                <div>
                    {/* Voice Selection */}
                    <div
                        className="glass-card"
                        style={{ padding: "20px 24px", marginBottom: "20px" }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "12px",
                            }}
                        >
                            <p className="section-label" style={{ margin: 0 }}>
                                Selected Voice
                            </p>
                            <button
                                onClick={() => setShowVoicePicker(!showVoicePicker)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: "none",
                                    border: "none",
                                    color: "var(--accent-purple)",
                                    fontSize: "0.82rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Change <ChevronDown size={14} />
                            </button>
                        </div>

                        {selectedVoice ? (
                            <VoiceCard voice={selectedVoice} isSelected compact />
                        ) : (
                            <div
                                style={{
                                    padding: "20px",
                                    textAlign: "center",
                                    color: "var(--text-muted)",
                                    fontSize: "0.88rem",
                                }}
                            >
                                No voice selected.{" "}
                                <a
                                    href="/clone"
                                    style={{
                                        color: "var(--accent-purple)",
                                        textDecoration: "underline",
                                    }}
                                >
                                    Clone one first
                                </a>
                            </div>
                        )}

                        {/* Voice Picker Dropdown */}
                        {showVoicePicker && voices.length > 0 && (
                            <div
                                style={{
                                    marginTop: "12px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                    maxHeight: "240px",
                                    overflowY: "auto",
                                    padding: "4px 0",
                                }}
                            >
                                {voices.map((v) => (
                                    <VoiceCard
                                        key={v.id}
                                        voice={v}
                                        isSelected={selectedVoice?.id === v.id}
                                        onSelect={(voice) => {
                                            setSelectedVoice(voice);
                                            setShowVoicePicker(false);
                                        }}
                                        compact
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Text Input */}
                    <div
                        className="glass-card"
                        style={{ padding: "20px 24px", marginBottom: "20px" }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "12px",
                            }}
                        >
                            <p className="section-label" style={{ margin: 0 }}>
                                Script / Text
                            </p>
                            <span
                                style={{
                                    fontSize: "0.75rem",
                                    color:
                                        charCount > 5000
                                            ? "#ef4444"
                                            : "var(--text-muted)",
                                }}
                            >
                                {charCount}/5000
                            </span>
                        </div>
                        <textarea
                            className="text-area"
                            placeholder="Enter the text you want to convert to speech...&#10;&#10;You can use tags like (laughs), (sighs), (gasps) for paralinguistic effects."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            maxLength={5000}
                            style={{ minHeight: "180px" }}
                        />

                        {/* Paralinguistic Tags */}
                        <div style={{ marginTop: "14px" }}>
                            <p
                                style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-muted)",
                                    marginBottom: "8px",
                                    fontWeight: 500,
                                }}
                            >
                                Insert paralinguistic tags:
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                {PARALINGUISTICS.map((tag) => (
                                    <button
                                        key={tag}
                                        className="tag"
                                        onClick={() => insertParalinguistic(tag)}
                                    >
                                        <Plus size={11} /> {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Language */}
                    <div
                        className="glass-card"
                        style={{ padding: "20px 24px", marginBottom: "20px" }}
                    >
                        <p className="section-label">Language</p>
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "8px",
                                marginTop: "8px",
                            }}
                        >
                            {SUPPORTED_LANGUAGES.map((lang) => (
                                <button
                                    key={lang}
                                    className={`tag ${language === lang ? "active" : ""}`}
                                    onClick={() => setLanguage(lang)}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Output */}
                    <div style={{ marginBottom: "20px" }}>
                        <AudioPlayer
                            audioUrl={outputUrl}
                            label="Generated Output"
                            showDownload
                        />
                    </div>

                    {/* Generate Button */}
                    <ProgressBar
                        progress={generationProgress}
                        isActive={isGenerating}
                        label={isGenerating ? "Synthesizing speech..." : "Generation complete!"}
                        accentColor="#06b6d4"
                        accentColorEnd="#8b5cf6"
                    />

                    <button
                        className="glow-btn"
                        onClick={() => {
                            setGenerationProgress(0);
                            handleGenerate();
                        }}
                        disabled={!text.trim() || !selectedVoice || isGenerating}
                        style={{
                            width: "100%",
                            padding: "16px",
                            fontSize: "1rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px",
                            position: "relative",
                            overflow: "hidden"
                        }}
                    >
                        {isGenerating && (
                            <div
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    height: "100%",
                                    width: `${generationProgress}%`,
                                    background: "rgba(255, 255, 255, 0.15)",
                                    transition: "width 0.5s ease"
                                }}
                            />
                        )}
                        {isGenerating ? (
                            <>
                                <Loader2 size={18} className="pulse-glow" />
                                Generating Audio... {generationProgress}%
                            </>
                        ) : (
                            <>
                                <Volume2 size={18} />
                                Generate Speech
                            </>
                        )}
                    </button>
                </div>

                {/* Right Column — Settings Panel */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                        position: "sticky",
                        top: "32px",
                    }}
                >
                    {/* Emotion */}
                    <div className="glass-card" style={{ padding: "20px" }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "14px",
                            }}
                        >
                            <Smile size={16} color="var(--accent-purple)" />
                            <p className="section-label" style={{ margin: 0 }}>
                                Emotion
                            </p>
                        </div>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "6px",
                            }}
                        >
                            {EMOTIONS.map((em) => (
                                <button
                                    key={em}
                                    className={`tag ${emotion === em ? "active" : ""}`}
                                    onClick={() => setEmotion(em)}
                                    style={{
                                        textTransform: "capitalize",
                                        justifyContent: "center",
                                    }}
                                >
                                    {em}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Speed & Pitch */}
                    <div className="glass-card" style={{ padding: "20px" }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "14px",
                            }}
                        >
                            <Gauge size={16} color="var(--accent-purple)" />
                            <p className="section-label" style={{ margin: 0 }}>
                                Speed & Pitch
                            </p>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "8px",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: "0.82rem",
                                        color: "var(--text-secondary)",
                                    }}
                                >
                                    Speed
                                </span>
                                <span
                                    style={{
                                        fontSize: "0.82rem",
                                        color: "var(--accent-purple)",
                                        fontWeight: 600,
                                        fontVariantNumeric: "tabular-nums",
                                    }}
                                >
                                    {speed.toFixed(1)}x
                                </span>
                            </div>
                            <input
                                type="range"
                                className="slider"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={speed}
                                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                            />
                        </div>

                        <div>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "8px",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: "0.82rem",
                                        color: "var(--text-secondary)",
                                    }}
                                >
                                    Pitch
                                </span>
                                <span
                                    style={{
                                        fontSize: "0.82rem",
                                        color: "var(--accent-purple)",
                                        fontWeight: 600,
                                        fontVariantNumeric: "tabular-nums",
                                    }}
                                >
                                    {pitch.toFixed(1)}x
                                </span>
                            </div>
                            <input
                                type="range"
                                className="slider"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={pitch}
                                onChange={(e) => setPitch(parseFloat(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* Duration Control */}
                    <div className="glass-card" style={{ padding: "20px" }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "14px",
                            }}
                        >
                            <Timer size={16} color="var(--accent-purple)" />
                            <p className="section-label" style={{ margin: 0 }}>
                                Duration Control
                            </p>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                marginBottom: "12px",
                            }}
                        >
                            <label
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    cursor: "pointer",
                                    fontSize: "0.85rem",
                                    color: "var(--text-secondary)",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={useDuration}
                                    onChange={(e) => setUseDuration(e.target.checked)}
                                    style={{ accentColor: "var(--accent-purple)" }}
                                />
                                Force exact duration
                            </label>
                        </div>

                        {useDuration && (
                            <div>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginBottom: "8px",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "0.82rem",
                                            color: "var(--text-secondary)",
                                        }}
                                    >
                                        Duration
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "0.82rem",
                                            color: "var(--accent-purple)",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {(duration || 5).toFixed(1)}s
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    className="slider"
                                    min="0.5"
                                    max="30"
                                    step="0.1"
                                    value={duration || 5}
                                    onChange={(e) =>
                                        setDuration(parseFloat(e.target.value))
                                    }
                                />
                            </div>
                        )}
                    </div>

                    {/* Style Instructions */}
                    <div className="glass-card" style={{ padding: "20px" }}>
                        <p className="section-label">Style Instructions</p>
                        <textarea
                            className="text-area"
                            placeholder="e.g., Speak slowly with a warm, soothing tone. Emphasize the last word of each sentence."
                            value={style}
                            onChange={(e) => setStyle(e.target.value)}
                            style={{
                                minHeight: "80px",
                                fontSize: "0.85rem",
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
