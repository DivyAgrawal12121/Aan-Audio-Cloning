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
        if (!confirm(`DELETE VOICE "${voice.name.toUpperCase()}"?`)) return;
        try {
            await deleteVoice(voice.id);
            setVoices((prev) => prev.filter((v) => v.id !== voice.id));
        } catch (err) { }
    };

    const handlePreview = async (voice: SavedVoice) => {
        setPreviewingId(voice.id);
        try {
            const blob = await previewVoice(voice.id);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(blob));
        } catch (err) {
        } finally {
            setPreviewingId(null);
        }
    };

    const filtered = voices.filter(
        (v) =>
            v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="page-container-md">
            {/* Header */}
            <div className="page-hero" style={{ marginBottom: "32px" }}>
                <div style={{ width: 56, height: 56, background: "var(--accent-amber)", border: "var(--border-thick)", boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Library size={26} color="black" strokeWidth={3} />
                </div>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>My Voices</h1>
                    <p style={{ fontWeight: 600 }}>{voices.length} speakers in your local vault.</p>
                </div>
            </div>

            {/* Search & Refresh */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
                <div style={{ flex: 1, position: "relative" }}>
                    <Search
                        size={18}
                        style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#000", pointerEvents: "none" }}
                        strokeWidth={3}
                    />
                    <input
                        type="text"
                        className="input-field"
                        placeholder="SEARCH YOUR LIBRARY..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: "48px", fontWeight: 800 }}
                    />
                </div>
                <button
                    onClick={loadVoices}
                    style={{
                        width: 52, height: 52, background: "var(--accent-purple)", border: "var(--border-thin)",
                        boxShadow: "3px 3px 0px #000", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                    }}
                >
                    <RefreshCw size={20} strokeWidth={3} color="black" className={isLoading ? "spin" : ""} />
                </button>
            </div>

            {/* Preview Player */}
            {previewUrl && (
                <div style={{ marginBottom: "24px" }}>
                    <AudioPlayer audioUrl={previewUrl} label="ACTIVE PREVIEW" showDownload={false} />
                </div>
            )}

            {/* Voice List */}
            {isLoading ? (
                <div className="glass-card" style={{ padding: "60px", textAlign: "center", background: "#fff" }}>
                    <Loader2 size={40} className="spin" style={{ margin: "0 auto 16px", color: "var(--accent-purple)" }} strokeWidth={3} />
                    <p style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>Accessing Vault...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-card" style={{ padding: "60px 40px", textAlign: "center", background: "var(--bg-secondary)" }}>
                    <Library size={48} color="rgba(0,0,0,0.2)" style={{ margin: "0 auto 20px" }} strokeWidth={1} />
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "12px" }}>
                        {searchQuery ? "TRACK LOST" : "VAULT EMPTY"}
                    </h3>
                    <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", maxWidth: "400px", margin: "0 auto 24px" }}>
                        {searchQuery ? "NO VOICES MATCH YOUR QUERY." : "YOU HAVEN'T CLONED OR DESIGNED ANY VOICES YET."}
                    </p>
                    {!searchQuery && (
                        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
                            <a href="/clone" className="sketchy-btn" style={{ background: "var(--accent-cyan)", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>CLONE NOW</a>
                            <a href="/design" className="sketchy-btn" style={{ background: "var(--accent-pink)", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>DESIGN NEW</a>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {filtered.map((voice) => (
                        <div key={voice.id} style={{ position: "relative" }}>
                            <VoiceCard voice={voice} onDelete={handleDelete} onPreview={handlePreview} />
                            {previewingId === voice.id && (
                                <div style={{
                                    position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", border: "var(--border-thin)",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", zIndex: 10
                                }}>
                                    <Loader2 size={24} className="spin" color="black" strokeWidth={3} />
                                    <span style={{ fontWeight: 900, textTransform: "uppercase" }}>PREVIEWING...</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
