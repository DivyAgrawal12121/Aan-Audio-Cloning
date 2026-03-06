"use client";

import React, { useState, useEffect } from "react";
import { Library, Search, Loader2, RefreshCw } from "lucide-react";
import VoiceCard from "@/components/VoiceCard";
import AudioPlayer from "@/components/AudioPlayer";
import type { SavedVoice } from "@/lib/types";
import { getVoices, deleteVoice, previewVoice } from "@/lib/api";

export default function VoicesPage() {
    const [voices, setVoices] = useState<SavedVoice[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewingId, setPreviewingId] = useState<string | null>(null);

    useEffect(() => {
        loadVoices();
    }, []);

    const loadVoices = async () => {
        setIsLoading(true);
        try {
            const data = await getVoices();
            setVoices(data);
        } catch {
            setVoices([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (voice: SavedVoice) => {
        if (!confirm(`Delete voice "${voice.name}"? This cannot be undone.`)) return;
        try {
            await deleteVoice(voice.id);
            setVoices((prev) => prev.filter((v) => v.id !== voice.id));
        } catch (err) {
            console.error("Failed to delete:", err);
        }
    };

    const handlePreview = async (voice: SavedVoice) => {
        setPreviewingId(voice.id);
        try {
            const blob = await previewVoice(voice.id);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(blob));
        } catch (err) {
            console.error("Preview failed:", err);
        } finally {
            setPreviewingId(null);
        }
    };

    const filtered = voices.filter(
        (v) =>
            v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.tags?.some((t) =>
                t.toLowerCase().includes(searchQuery.toLowerCase())
            )
    );

    return (
        <div style={{ maxWidth: "900px" }}>
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
                            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 8px 24px rgba(245, 158, 11, 0.25)",
                        }}
                    >
                        <Library size={22} color="white" />
                    </div>
                    <div>
                        <h1
                            style={{
                                fontSize: "1.8rem",
                                fontWeight: 800,
                                letterSpacing: "-0.02em",
                            }}
                        >
                            My Voices
                        </h1>
                        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                            {voices.length} voice{voices.length !== 1 ? "s" : ""} saved
                            locally
                        </p>
                    </div>
                </div>
            </div>

            {/* Search & Refresh */}
            <div
                style={{
                    display: "flex",
                    gap: "12px",
                    marginBottom: "24px",
                }}
            >
                <div style={{ flex: 1, position: "relative" }}>
                    <Search
                        size={16}
                        style={{
                            position: "absolute",
                            left: "14px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--text-muted)",
                            pointerEvents: "none",
                        }}
                    />
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Search voices by name, description, language, or tag..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: "40px" }}
                    />
                </div>
                <button
                    onClick={loadVoices}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: "var(--radius-md)",
                        background: "rgba(139, 92, 246, 0.08)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(139, 92, 246, 0.15)";
                        e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(139, 92, 246, 0.08)";
                        e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Preview Player */}
            {previewUrl && (
                <div style={{ marginBottom: "20px" }}>
                    <AudioPlayer
                        audioUrl={previewUrl}
                        label="Voice Preview"
                        showDownload={false}
                    />
                </div>
            )}

            {/* Voice List */}
            {isLoading ? (
                <div
                    style={{
                        textAlign: "center",
                        padding: "60px 0",
                        color: "var(--text-muted)",
                    }}
                >
                    <Loader2
                        size={32}
                        className="pulse-glow"
                        style={{
                            margin: "0 auto 12px",
                            color: "var(--accent-purple)",
                        }}
                    />
                    <p>Loading voices...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div
                    className="glass-card"
                    style={{
                        padding: "60px 40px",
                        textAlign: "center",
                    }}
                >
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: "20px",
                            background: "rgba(139, 92, 246, 0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 16px",
                        }}
                    >
                        <Library size={28} color="var(--text-muted)" />
                    </div>
                    <h3
                        style={{
                            fontSize: "1.1rem",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            marginBottom: "8px",
                        }}
                    >
                        {searchQuery ? "No matching voices" : "No voices yet"}
                    </h3>
                    <p
                        style={{
                            fontSize: "0.88rem",
                            color: "var(--text-muted)",
                            lineHeight: 1.5,
                            maxWidth: "400px",
                            margin: "0 auto",
                        }}
                    >
                        {searchQuery
                            ? "Try adjusting your search terms."
                            : "Start by cloning a voice from an audio sample or designing a new one from a text description."}
                    </p>
                    {!searchQuery && (
                        <div
                            style={{
                                display: "flex",
                                gap: "12px",
                                justifyContent: "center",
                                marginTop: "20px",
                            }}
                        >
                            <a href="/clone" className="glow-btn" style={{ textDecoration: "none" }}>
                                Clone Voice
                            </a>
                            <a
                                href="/design"
                                className="glow-btn"
                                style={{
                                    textDecoration: "none",
                                    background: "linear-gradient(135deg, #ec4899, #f43f5e)",
                                }}
                            >
                                Design Voice
                            </a>
                        </div>
                    )}
                </div>
            ) : (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                    }}
                >
                    {filtered.map((voice) => (
                        <div key={voice.id} style={{ position: "relative" }}>
                            <VoiceCard
                                voice={voice}
                                onDelete={handleDelete}
                                onPreview={handlePreview}
                            />
                            {previewingId === voice.id && (
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        background: "rgba(6, 6, 14, 0.7)",
                                        borderRadius: "var(--radius-lg)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                        color: "var(--accent-purple)",
                                        fontSize: "0.88rem",
                                        fontWeight: 500,
                                    }}
                                >
                                    <Loader2 size={18} className="pulse-glow" />
                                    Generating preview...
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
