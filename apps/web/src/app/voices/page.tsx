"use client";

import React, { useState } from "react";
import { Library, Search, Loader2, UploadCloud } from "lucide-react";
import { VoiceCard, AudioPlayer, Button } from "@resound-studio/ui";
import type { SavedVoice } from "@resound-studio/shared";
import { useVoices, useDeleteVoice, useImportVoice } from "@/hooks/api/useVoices";
import { previewVoice } from "@resound-studio/api"; // Note: we'll wrap this in React Query soon, but standard fetch works for audio preview
import VoiceDetailsModal from "@/components/VoiceDetailsModal";

export default function VoicesPage() {
    const { data: voices = [], isLoading } = useVoices();
    const deleteVoice = useDeleteVoice();
    const importVoice = useImportVoice();

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        await importVoice.mutateAsync(formData);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const [searchQuery, setSearchQuery] = useState("");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewingId, setPreviewingId] = useState<string | null>(null);
    const [previewChannelId, setPreviewChannelId] = useState<string | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<SavedVoice | null>(null);

    const handleDelete = async (voice: SavedVoice) => {
        if (!confirm(`DELETE VOICE "${voice.name.toUpperCase()}"?`)) return;
        deleteVoice.mutate(voice.id);
    };

    const handlePreview = async (voice: SavedVoice) => {
        setPreviewingId(voice.id);
        setPreviewChannelId(voice.channel_id || null);
        try {
            const blob = await previewVoice(voice.id);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(blob));
        } catch (err) {
            console.error(err);
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
            <div className="page-hero flex items-center justify-between" style={{ marginBottom: "32px" }}>
                <div className="flex items-center gap-4">
                    <div style={{ width: 56, height: 56, background: "var(--accent-amber)", border: "var(--border-thick)", boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Library size={26} color="black" strokeWidth={3} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>My Voices</h1>
                        <p style={{ fontWeight: 600 }}>{voices.length} speakers in your local vault.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <input type="file" ref={fileInputRef} accept=".resound" className="hidden" onChange={handleImport} />
                    <Button onClick={() => fileInputRef.current?.click()} disabled={importVoice.isPending} variant="secondary">
                        {importVoice.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                        Import .resound
                    </Button>
                    <Button onClick={() => window.location.href = '/clone'}>Clone New</Button>
                </div>
            </div>

            {/* Search */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
                <div style={{ flex: 1, position: "relative" }}>
                    <Search
                        size={18}
                        style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#000", pointerEvents: "none" }}
                        strokeWidth={3}
                    />
                    <input
                        type="text"
                        className="input-field w-full"
                        placeholder="SEARCH YOUR LIBRARY..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: "48px", fontWeight: 800 }}
                    />
                </div>
            </div>

            {/* Preview Player */}
            {previewUrl && (
                <div style={{ marginBottom: "24px" }}>
                    <AudioPlayer audioUrl={previewUrl} label="ACTIVE PREVIEW" showDownload={false} channelId={previewChannelId} />
                </div>
            )}

            {/* Voice List */}
            {isLoading ? (
                <div className="glass-card" style={{ padding: "60px", textAlign: "center", background: "var(--bg-secondary)" }}>
                    <Loader2 size={40} className="spin" style={{ margin: "0 auto 16px", color: "var(--text-muted)" }} strokeWidth={3} />
                    <p className="animate-pulse" style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>Accessing Vault...</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((voice) => (
                        <div key={voice.id} style={{ position: "relative" }}>
                            <VoiceCard
                                voice={voice}
                                onDelete={handleDelete}
                                onPreview={handlePreview}
                                onSelect={() => setSelectedVoice(voice)}
                                isSelected={selectedVoice?.id === voice.id}
                            />
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

            <VoiceDetailsModal
                voice={selectedVoice}
                onClose={() => setSelectedVoice(null)}
            />
        </div>
    );
}
