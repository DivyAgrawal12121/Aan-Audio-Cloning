"use client";

import React, { useState } from "react";
import { Music, Loader2, Wand2, Info } from "lucide-react";
import { AudioPlayer, useSimulatedProgress } from "@resound-studio/ui";
import { generateFoley } from "@resound-studio/api";

const PRESETS = [
    "Forest ambiance birds chirping",
    "Crowd cheering stadium",
    "Dog barking aggressively",
    "Thunder heavy rain",
    "Ocean waves beach",
    "Busy cafe coffee machine",
    "Fire crackling fireplace",
    "Spaceship engine humming",
    "Wind howling canyon",
    "City traffic sounds",
];

export default function FoleyPage() {
    const [description, setDescription] = useState("");
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { progress, isActive, start, complete } = useSimulatedProgress(400, 4);

    const handleGenerate = async () => {
        if (!description.trim()) return;
        start();
        setError(null);
        setAudioUrl(null);
        try {
            const blob = await generateFoley(description);
            setAudioUrl(URL.createObjectURL(blob));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Generation failed");
        } finally {
            complete();
        }
    };

    return (
        <div className="page-container-sm">
            {/* Header */}
            <div className="page-hero" style={{ marginBottom: "32px" }}>
                <div
                    style={{
                        width: 56, height: 56,
                        background: "var(--accent-amber)",
                        border: "var(--border-thick)",
                        boxShadow: "4px 4px 0px #000",
                        display: "flex", alignItems: "center", justifyContent: "center"
                    }}
                >
                    <Music size={26} color="black" strokeWidth={3} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>Sound Effects</h1>
                    <p style={{ fontWeight: 600 }}>Generate foley by describing any sound.</p>
                </div>
            </div>

            {/* Hint Banner */}
            <div className="glass-card" style={{
                padding: "16px 20px",
                marginBottom: "20px",
                background: "var(--accent-cyan)",
                display: "flex", gap: "12px", alignItems: "center",
                borderRadius: "4px"
            }}>
                <Info size={20} strokeWidth={3} />
                <p style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Bark Engine Required • Switch in Sidebar
                </p>
            </div>

            <div className="section-card" style={{ marginBottom: "20px" }}>
                <p className="section-label" style={{ color: "#000", fontWeight: 900 }}>What sound do you need?</p>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="e.g. [dog barking], [laughter], rainforest at night..."
                    rows={3}
                    className="text-area"
                    style={{ marginBottom: "16px" }}
                />

                <p style={{ fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Try these:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {PRESETS.map(p => (
                        <button key={p} onClick={() => setDescription(p)} className="tag" style={{ border: "2px solid #000", cursor: "pointer" }}>
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Generate Button with Progress */}
            <div style={{ position: "relative", marginBottom: "20px" }}>
                <button
                    onClick={handleGenerate}
                    disabled={isActive || !description.trim()}
                    className="gen-btn"
                    style={{
                        width: "100%",
                        padding: "18px",
                        background: isActive ? "#fff" : "var(--accent-pink)",
                    }}
                >
                    {isActive ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Loader2 size={20} className="spin" strokeWidth={3} />
                            <span>GENERATING... {Math.round(progress)}%</span>
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Wand2 size={20} strokeWidth={3} />
                            <span>GENERATE SOUND</span>
                        </div>
                    )}
                </button>

                {isActive && (
                    <div style={{
                        position: "absolute", bottom: "-4px", left: "0", right: "4px", height: "8px",
                        background: "#000", border: "2px solid #000", overflow: "hidden"
                    }}>
                        <div style={{
                            width: `${progress}%`, height: "100%",
                            background: "var(--accent-cyan)",
                            transition: "width 0.3s ease"
                        }} />
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="glass-card" style={{ background: "#fee2e2", borderColor: "#ef4444", padding: "16px" }}>
                    <p style={{ fontSize: "0.85rem", fontWeight: 800, color: "#ef4444" }}>⚠️ ERROR: {error.toUpperCase()}</p>
                </div>
            )}

            {/* Result */}
            {audioUrl && (
                <div className="section-card" style={{ marginTop: "24px", animation: "slideInRight 0.3s ease", background: "var(--accent-green)" }}>
                    <h3 style={{ marginBottom: "12px", color: "#000" }}>READY TO PLAY</h3>
                    <AudioPlayer audioUrl={audioUrl} label="GENERATED FOLEY" showDownload />
                </div>
            )}
        </div>
    );
}
