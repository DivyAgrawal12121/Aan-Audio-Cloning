"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Podcast, Loader2, Info, Mic2, Plus, Trash2, Layers } from "lucide-react";
import { useSimulatedProgress } from "@resound-studio/ui";
import type { SavedVoice } from "@resound-studio/shared";
import { generatePodcastTimeline, getVoices } from "@resound-studio/api";

const LANGUAGES = ["English", "Chinese", "French", "German", "Hindi", "Italian", "Japanese", "Korean", "Portuguese", "Russian", "Spanish"];

interface DialogBlock {
    id: string;
    voice_id: string;
    text: string;
}

export default function PodcastPage() {
    const router = useRouter();
    const [voices, setVoices] = useState<SavedVoice[]>([]);

    // Default blocks
    const [blocks, setBlocks] = useState<DialogBlock[]>([
        { id: "1", voice_id: "", text: "Welcome to Resound Studio Podcast! Today we discuss the future of AI voice technology." },
        { id: "2", voice_id: "", text: "Thanks for having me! It's incredible how far voice cloning has come in just the past year." }
    ]);

    const [storyName, setStoryName] = useState("AI Future Discussion");
    const [language, setLanguage] = useState("English");
    const [error, setError] = useState<string | null>(null);
    const { progress, isActive, start, complete } = useSimulatedProgress();

    useEffect(() => {
        getVoices().then(v => {
            setVoices(v);
            // Autofill voices if possible
            setBlocks(prev => {
                const newBlocks = [...prev];
                if (v.length > 0 && !newBlocks[0].voice_id) newBlocks[0].voice_id = v[0].id;
                if (v.length > 1 && !newBlocks[1].voice_id) newBlocks[1].voice_id = v[1].id;
                return newBlocks;
            });
        }).catch(() => { });
    }, []);

    const addBlock = () => {
        setBlocks(prev => [...prev, { id: Date.now().toString(), voice_id: prev[prev.length - 1]?.voice_id || "", text: "" }]);
    };

    const removeBlock = (id: string) => {
        setBlocks(prev => prev.filter(b => b.id !== id));
    };

    const updateBlock = (id: string, field: keyof DialogBlock, value: string) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const handleGenerate = async () => {
        const validBlocks = blocks.filter(b => b.voice_id && b.text.trim());
        if (validBlocks.length === 0) {
            setError("Add at least one valid dialogue block.");
            return;
        }

        start();
        setError(null);
        try {
            const result = await generatePodcastTimeline({
                story_name: storyName.trim() || "Untitled Podcast",
                language,
                blocks: validBlocks.map(b => ({ voice_id: b.voice_id, text: b.text.trim() }))
            });
            // Redirect to Timeline Editor where the generated Podcast will be ready to mix
            router.push("/stories");
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Timeline generation failed");
        } finally {
            complete();
        }
    };

    return (
        <div className="page-container-md" style={{ maxWidth: "850px" }}>
            {/* Header */}
            <div className="page-hero" style={{ marginBottom: "32px" }}>
                <div style={{ width: 56, height: 56, background: "var(--accent-amber)", border: "var(--border-thick)", boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Podcast size={26} color="black" strokeWidth={3} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>Podcast Studio</h1>
                    <p style={{ fontWeight: 600 }}>Create multi-speaker conversations sent directly to the Timeline Editor.</p>
                </div>
            </div>

            {/* General Settings */}
            <div className="section-card" style={{ marginBottom: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                    <p className="section-label" style={{ marginBottom: "8px" }}>EPISODE TITLE</p>
                    <input
                        type="text"
                        value={storyName}
                        onChange={e => setStoryName(e.target.value)}
                        className="input-field"
                        placeholder="e.g. Episode 42: The Future"
                    />
                </div>
                <div>
                    <p className="section-label" style={{ marginBottom: "8px" }}>LANGUAGE</p>
                    <select value={language} onChange={e => setLanguage(e.target.value)} className="select-field">
                        {LANGUAGES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                    </select>
                </div>
            </div>

            {/* Editor */}
            <div className="section-card" style={{ marginBottom: "20px", padding: 0, overflow: "hidden", background: "transparent", border: "none", boxShadow: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <p className="section-label" style={{ marginBottom: 0, color: "#000" }}>Conversation Blocks</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {blocks.map((block, index) => (
                        <div key={block.id} style={{ background: "#fff", border: "var(--border-thin)", padding: "16px", borderRadius: "8px", position: "relative" }}>
                            <div style={{ position: "absolute", left: "-12px", top: "16px", background: "#000", color: "#fff", fontWeight: 900, padding: "2px 8px", fontSize: "0.75rem", zIndex: 10 }}>
                                #{index + 1}
                            </div>

                            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                                <div style={{ width: "220px", flexShrink: 0 }}>
                                    <label style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "4px", display: "block" }}>Speaker Voice</label>
                                    <select value={block.voice_id} onChange={e => updateBlock(block.id, "voice_id", e.target.value)} className="select-field" style={{ padding: "8px" }}>
                                        <option value="">Select a Voice...</option>
                                        {voices.map(v => <option key={v.id} value={v.id}>{v.name.toUpperCase()}</option>)}
                                    </select>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", marginBottom: "4px", display: "block", color: "transparent" }}>Text</label>
                                    <textarea
                                        value={block.text}
                                        onChange={e => updateBlock(block.id, "text", e.target.value)}
                                        rows={3}
                                        placeholder="What does this speaker say?"
                                        className="text-area"
                                        style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", padding: "8px", minHeight: "80px" }}
                                    />
                                </div>

                                <button
                                    onClick={() => removeBlock(block.id)}
                                    style={{ marginTop: "24px", color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer", padding: "8px" }}
                                    onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                                    onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={addBlock}
                    style={{ width: "100%", padding: "16px", background: "rgba(0,0,0,0.05)", border: "2px dashed rgba(0,0,0,0.2)", marginTop: "16px", fontWeight: 800, color: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.1)"; e.currentTarget.style.color = "#000"; e.currentTarget.style.borderColor = "#000"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.05)"; e.currentTarget.style.color = "rgba(0,0,0,0.5)"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.2)"; }}
                >
                    <Plus size={18} strokeWidth={3} />
                    ADD DIALOGUE BLOCK
                </button>
            </div>

            {/* Action */}
            <div style={{ position: "relative", marginBottom: "32px", marginTop: "32px" }}>
                <button
                    onClick={handleGenerate}
                    disabled={isActive || blocks.length === 0}
                    className="gen-btn"
                    style={{ width: "100%", padding: "20px", background: isActive ? "#fff" : "var(--accent-amber)" }}
                >
                    {isActive ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Loader2 size={20} className="spin" strokeWidth={3} />
                            <span>ASSEMBLING TIMELINE... {Math.round(progress)}%</span>
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Layers size={20} strokeWidth={3} />
                            <span>GENERATE TO TIMELINE</span>
                        </div>
                    )}
                </button>
                {isActive && (
                    <div style={{ position: "absolute", bottom: "-4px", left: "0", right: "4px", height: "8px", background: "#000", border: "2px solid #000", overflow: "hidden" }}>
                        <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent-pink)", transition: "width 0.3s ease" }} />
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div style={{ padding: "16px", marginBottom: "20px", background: "#fee2e2", border: "var(--border-thin)", boxShadow: "4px 4px 0px #000" }}>
                    <p style={{ fontSize: "0.85rem", fontWeight: 900, color: "#ef4444" }}>⚠️ MODULE FAILED: {error}</p>
                </div>
            )}
        </div>
    );
}

