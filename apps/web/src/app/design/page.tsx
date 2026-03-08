"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, Wand2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { AudioPlayer, useSimulatedProgress } from "@resound-studio/ui";
import { SUPPORTED_LANGUAGES } from "@resound-studio/shared";
import { previewDesignVoice, cloneVoice } from "@resound-studio/api";
import { useChannels } from "@/hooks/api/useChannels";
import { useServerStore } from "@/stores/useServerStore";

const VOICE_PRESETS = [
    {
        label: "Warm Narrator",
        description: "A mature male voice, warm and deep, like a seasoned audiobook narrator. Calm pacing, rich bass tones.",
    },
    {
        label: "Young Energetic",
        description: "A young, enthusiastic female voice with high energy. Quick pacing, bright and cheerful tone.",
    },
    {
        label: "News Anchor",
        description: "Professional, authoritative mid-range voice. Clear articulation, neutral accent, steady pace.",
    },
    {
        label: "Storyteller",
        description: "A gentle, slightly raspy elderly voice. Slow, measured pacing with dramatic pauses. Warm and wise.",
    },
];

export default function DesignPage() {
    const [description, setDescription] = useState("");
    const [voiceName, setVoiceName] = useState("");
    const [language, setLanguage] = useState("English");
    const [age, setAge] = useState("Middle-aged");
    const [gender, setGender] = useState("Male");
    const [tone, setTone] = useState("Neutral");
    const [channelId, setChannelId] = useState("");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [statusMessage, setStatusMessage] = useState("");
    const { data: channels = [] } = useChannels();
    const { capabilities, activeModel } = useServerStore();
    const isSupported = capabilities.includes("design");
    const { progress: designProgress, isActive: isDesigning, start: startProgress, complete: completeProgress } = useSimulatedProgress();

    const handlePreview = async () => {
        startProgress();
        setStatus("idle");
        setAudioBlob(null);

        const finalPrompt = `A ${age.toLowerCase()} ${gender.toLowerCase()} voice with a ${tone.toLowerCase()} tone. ${description.trim()}`.trim();

        try {
            const blob = await previewDesignVoice(finalPrompt, language);
            setAudioBlob(blob);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(blob));
        } catch (err: unknown) {
            setStatus("error");
            setStatusMessage("DESIGN PREVIEW FAILED.");
        } finally {
            completeProgress();
        }
    };

    const handleSave = async () => {
        if (!voiceName.trim() || !audioBlob) return;
        setStatus("idle");
        try {
            const formData = new FormData();
            formData.append("audio", audioBlob, "design_preview.wav");
            formData.append("name", voiceName.trim());
            formData.append("description", description.trim());
            formData.append("language", language);
            formData.append("tags", JSON.stringify(["designed"]));
            if (channelId) formData.append("channel_id", channelId);

            await cloneVoice(formData);
            setStatus("success");
            setStatusMessage(`VOICE "${voiceName.toUpperCase()}" SAVED TO WORKSPACE!`);

            // clear form for next design
            setAudioBlob(null);
            setVoiceName("");
        } catch (err: unknown) {
            setStatus("error");
            setStatusMessage("FAILED TO SAVE VOICE.");
        }
    };

    return (
        <div className="page-container-sm">
            {/* Header */}
            <div className="page-hero" style={{ marginBottom: "32px" }}>
                <div style={{ width: 56, height: 56, background: "var(--accent-pink)", border: "var(--border-thick)", boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Sparkles size={26} color="black" strokeWidth={3} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>Voice Design</h1>
                    <p style={{ fontWeight: 600 }}>Craft unique voices from text descriptions.</p>
                </div>
            </div>

            {/* Warning Banner */}
            {!isSupported && activeModel && (
                <div style={{ padding: "16px", marginBottom: "20px", background: "#fee2e2", border: "var(--border-thin)", boxShadow: "4px 4px 0px #000", display: "flex", gap: "10px", alignItems: "center" }}>
                    <AlertCircle size={20} color="#ef4444" strokeWidth={3} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#ef4444" }}>WARNING: THE ACTIVE ENGINE ({activeModel.toUpperCase()}) DOES NOT SUPPORT VOICE DESIGN FROM TEXT.</span>
                </div>
            )}

            {/* Design Form */}
            <div className="section-card" style={{ marginBottom: "20px", opacity: !isSupported && activeModel ? 0.6 : 1, pointerEvents: !isSupported && activeModel ? "none" : "auto" }}>
                <p className="section-label" style={{ color: "#000" }}>Voice Blueprint</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                    <div>
                        <label style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase" }}>Age</label>
                        <select className="select-field" value={age} onChange={e => setAge(e.target.value)}>
                            {["Young", "Middle-aged", "Elderly"].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase" }}>Gender</label>
                        <select className="select-field" value={gender} onChange={e => setGender(e.target.value)}>
                            {["Male", "Female", "Androgynous"].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase" }}>Tone</label>
                        <select className="select-field" value={tone} onChange={e => setTone(e.target.value)}>
                            {["Neutral", "Authoritative", "Friendly", "Gravelly", "Energetic", "Calm", "Raspy"].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                </div>

                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "16px", fontWeight: 500 }}>
                    Add extra nuances to the timbre and personality (Optional).
                </p>
                <textarea
                    className="text-area"
                    placeholder="e.g., Speaks with a slight Southern drawl..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ minHeight: "100px" }}
                />
            </div>

            {/* Presets */}
            <div className="glass-card" style={{ padding: "24px", marginBottom: "20px", background: "var(--bg-secondary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <Wand2 size={18} color="black" strokeWidth={3} />
                    <p className="section-label" style={{ margin: 0, color: "#000" }}>Inspiration Library</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {VOICE_PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => {
                                setDescription(preset.description);
                                if (!voiceName) setVoiceName(preset.label);
                            }}
                            style={{
                                textAlign: "left",
                                padding: "16px",
                                background: description === preset.description ? "var(--accent-purple)" : "#fff",
                                border: "2px solid #000",
                                boxShadow: description === preset.description ? "none" : "3px 3px 0px #000",
                                transform: description === preset.description ? "translate(3px, 3px)" : "none",
                                cursor: "pointer",
                                transition: "all 0.1s ease",
                            }}
                        >
                            <p style={{ fontWeight: 900, fontSize: "0.85rem", textTransform: "uppercase", marginBottom: "4px" }}>{preset.label}</p>
                            <p style={{ fontSize: "0.7rem", fontWeight: 600, color: description === preset.description ? "rgba(0,0,0,0.8)" : "var(--text-muted)", lineHeight: 1.4 }}>
                                {preset.description.slice(0, 60)}...
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Preview Only */}
            {previewUrl && (
                <div style={{ marginBottom: "20px" }}>
                    <AudioPlayer audioUrl={previewUrl} label="DESIGN PREVIEW (UNSAVED)" showDownload={false} channelId={channelId} />
                </div>
            )}

            {/* Save Info */}
            {audioBlob && (
                <div className="section-card" style={{ marginBottom: "20px", border: "4px solid var(--accent-amber)" }}>
                    <p className="section-label" style={{ color: "#000" }}>Save to Voice Studio</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px" }}>
                        <div>
                            <label className="section-label" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>Voice Name *</label>
                            <input type="text" className="input-field" placeholder="e.g. Cinema King" value={voiceName} onChange={(e) => setVoiceName(e.target.value)} />
                        </div>
                        <div>
                            <label className="section-label" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>Language</label>
                            <select className="select-field" value={language} onChange={(e) => setLanguage(e.target.value)}>
                                {SUPPORTED_LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="section-label" style={{ fontSize: "0.65rem", marginBottom: "8px" }}>Audio Channel Routing (Optional)</label>
                            <select className="select-field" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
                                <option value="">Default OS Device</option>
                                {channels.map((ch) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <button
                        className="gen-btn"
                        onClick={handleSave}
                        disabled={!voiceName.trim() || isDesigning}
                        style={{ width: "100%", padding: "16px", background: "var(--accent-green)", marginTop: "20px" }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <CheckCircle2 size={16} strokeWidth={3} />
                            <span>SAVE TO WORKSPACE</span>
                        </div>
                    </button>
                </div>
            )}



            {/* Status */}
            {status !== "idle" && (
                <div style={{
                    padding: "16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px",
                    background: status === "success" ? "var(--accent-green)" : "#fee2e2",
                    border: "var(--border-thin)", boxShadow: "4px 4px 0px #000"
                }}>
                    {status === "success" ? <CheckCircle2 size={20} strokeWidth={3} /> : <AlertCircle size={20} color="#ef4444" strokeWidth={3} />}
                    <span style={{ fontSize: "0.85rem", fontWeight: 900 }}>{statusMessage}</span>
                </div>
            )}

            {/* Generate Button */}
            <div style={{ position: "relative", marginBottom: "32px" }}>
                <button
                    className="gen-btn"
                    onClick={handlePreview}
                    disabled={isDesigning || !description.trim() && age === 'Middle-aged' && tone === 'Neutral'}
                    style={{ width: "100%", padding: "20px", background: isDesigning ? "#fff" : "var(--accent-pink)" }}
                >
                    {isDesigning ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Loader2 size={20} className="spin" strokeWidth={3} />
                            <span>BRAINSTORMING... {Math.round(designProgress)}%</span>
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Wand2 size={20} strokeWidth={3} />
                            <span>GENERATE PREVIEW</span>
                        </div>
                    )}
                </button>
                {isDesigning && (
                    <div style={{ position: "absolute", bottom: "-4px", left: "0", right: "4px", height: "8px", background: "#000", border: "2px solid #000", overflow: "hidden" }}>
                        <div style={{ width: `${designProgress}%`, height: "100%", background: "var(--accent-amber)", transition: "width 0.3s ease" }} />
                    </div>
                )}
            </div>
        </div>
    );
}
