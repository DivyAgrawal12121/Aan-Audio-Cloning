"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    MessageSquare,
    Loader2,
    Wand2,
    ChevronDown,
    Sparkles,
    Copy,
    RotateCcw,
} from "lucide-react";
import { AudioPlayer, VoiceCard, useSimulatedProgress } from "@resound-studio/ui";
import type { SavedVoice } from "@resound-studio/shared";
import { generateSpeech, getVoices } from "@resound-studio/api";

const PROMPT_TEMPLATES = [
    {
        label: "🎬 Movie Trailer",
        prompt: "In a deep, dramatic voice with intense energy and cinematic gravity",
        text: "In a world where nothing is what it seems... one hero must rise above the darkness.",
    },
    {
        label: "📰 News Anchor",
        prompt: "In a professional, authoritative, clear news anchor voice with measured pacing",
        text: "Breaking news tonight. Officials have confirmed the discovery of a major breakthrough in renewable energy technology.",
    },
    {
        label: "📖 Bedtime Story",
        prompt: "In a warm, gentle, soothing whisper like a parent reading a bedtime story",
        text: "Once upon a time, in a forest made of starlight, there lived a little fox who dreamed of flying.",
    },
    {
        label: "🎮 Game Character",
        prompt: "In an excited, energetic, slightly mischievous tone like a quirky video game character",
        text: "Hey! Over here! I found the secret passage! Quick, before the guards come back!",
    },
    {
        label: "😱 Horror Narration",
        prompt: "In a slow, creepy, unsettling whisper with long pauses and dread",
        text: "The door creaked open... and there, standing in the darkness... was something that should not exist.",
    },
    {
        label: "🎉 Excited Announcement",
        prompt: "In a super excited, high-energy, celebratory tone bursting with joy",
        text: "Oh my gosh, we did it! We actually did it! This is the greatest day of my entire life!",
    },
];

export default function PromptPage() {
    const [prompt, setPrompt] = useState("");
    const [text, setText] = useState("");
    const [selectedVoice, setSelectedVoice] = useState<SavedVoice | null>(null);
    const [language, setLanguage] = useState("English");
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

    const applyTemplate = useCallback((template: typeof PROMPT_TEMPLATES[0]) => {
        setPrompt(template.prompt);
        setText(template.text);
    }, []);

    const handleGenerate = async () => {
        if (!text.trim() || !selectedVoice) return;
        startProgress();
        try {
            // The prompt becomes the style directive — the engine uses it
            // as a paralinguistic cue prefix for Base model,
            // or as the instruct parameter for VoiceDesign model
            const blob = await generateSpeech({
                text: text.trim(),
                voiceId: selectedVoice.id,
                language,
                emotion: "neutral", // Let the prompt handle emotion naturally
                speed: 1.0,
                pitch: 1.0,
                style: prompt.trim() || undefined,
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
                <div style={{ width: 56, height: 56, background: "var(--accent-purple)", border: "var(--border-thick)", boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MessageSquare size={26} color="black" strokeWidth={3} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>Prompt Studio</h1>
                    <p style={{ fontWeight: 600 }}>Describe exactly how you want it to sound. One prompt. Total control.</p>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>
                {/* Left Column — Main Input */}
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

                    {/* Creative Prompt */}
                    <div className="section-card" style={{ marginBottom: "20px", background: "var(--accent-purple)", borderColor: "#000" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                            <p className="section-label" style={{ margin: 0, color: "#000", display: "flex", alignItems: "center", gap: "8px" }}>
                                <Sparkles size={16} strokeWidth={3} /> Voice Direction
                            </p>
                            <button
                                onClick={() => setPrompt("")}
                                style={{ background: "#fff", border: "2px solid #000", padding: "3px 8px", fontSize: "0.65rem", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                                <RotateCcw size={10} strokeWidth={3} /> CLEAR
                            </button>
                        </div>
                        <textarea
                            className="text-area"
                            placeholder="Describe HOW the voice should sound...&#10;&#10;Examples:&#10;• In a warm, cheerful tone with high energy&#10;• Whispering softly, as if telling a secret&#10;• Like an angry drill sergeant shouting orders&#10;• Calm and meditative, slow pacing, ASMR-like"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            style={{ minHeight: "150px", background: "#fff", fontSize: "0.9rem" }}
                        />
                    </div>

                    {/* Text Content */}
                    <div className="section-card" style={{ marginBottom: "20px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                            <p className="section-label" style={{ margin: 0, color: "#000" }}>What To Say</p>
                            <span style={{ fontSize: "0.65rem", fontWeight: 900, background: "#000", color: "#fff", padding: "2px 6px" }}>{text.length}/5000</span>
                        </div>
                        <textarea
                            className="text-area"
                            placeholder="Enter the text that should be spoken..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            maxLength={5000}
                            style={{ minHeight: "160px" }}
                        />
                    </div>

                    {/* Generate Button */}
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
                                    <span>GENERATE FROM PROMPT</span>
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

                {/* Right Column — Templates */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px", position: "sticky", top: "24px" }}>
                    {/* Quick Templates */}
                    <div className="section-card" style={{ background: "var(--bg-secondary)" }}>
                        <p className="section-label" style={{ color: "#000", marginBottom: "16px" }}>Quick Templates</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {PROMPT_TEMPLATES.map((tpl) => (
                                <button
                                    key={tpl.label}
                                    onClick={() => applyTemplate(tpl)}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "flex-start",
                                        gap: "4px",
                                        padding: "12px 14px",
                                        background: "#fff",
                                        border: "2px solid #000",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        boxShadow: "3px 3px 0px #000",
                                        transition: "all 0.1s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translate(-2px, -2px)";
                                        e.currentTarget.style.boxShadow = "5px 5px 0px #000";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "none";
                                        e.currentTarget.style.boxShadow = "3px 3px 0px #000";
                                    }}
                                >
                                    <span style={{ fontSize: "0.8rem", fontWeight: 900 }}>{tpl.label}</span>
                                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600, lineHeight: 1.3 }}>
                                        {tpl.prompt.substring(0, 60)}...
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Language */}
                    <div className="section-card">
                        <p className="section-label" style={{ color: "#000" }}>Language</p>
                        <select className="select-field" value={language} onChange={e => setLanguage(e.target.value)}>
                            {["English", "Chinese", "Japanese", "Korean", "German", "French", "Russian", "Portuguese", "Spanish", "Italian"].map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tips */}
                    <div className="section-card" style={{ background: "var(--accent-amber)" }}>
                        <p className="section-label" style={{ color: "#000", marginBottom: "8px" }}>💡 Tips</p>
                        <ul style={{ fontSize: "0.72rem", fontWeight: 700, color: "#000", lineHeight: 1.8, paddingLeft: "16px", margin: 0 }}>
                            <li>Be descriptive: <em>&quot;warm, gentle whisper&quot;</em></li>
                            <li>Set the mood: <em>&quot;angry, shouting&quot;</em></li>
                            <li>Reference styles: <em>&quot;like a movie trailer narrator&quot;</em></li>
                            <li>Control pacing: <em>&quot;slow and deliberate&quot;</em></li>
                            <li>Add character: <em>&quot;mischievous, playful tone&quot;</em></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
