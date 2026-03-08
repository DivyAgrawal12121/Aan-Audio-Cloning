"use client";

import React, { useState } from "react";
import { Clock, Play, Trash2, Download, Search, Loader2 } from "lucide-react";
import { AudioPlayer, Button } from "@resound-studio/ui";
import { useHistory, useDeleteHistoryItem, useClearHistory } from "@/hooks/api/useHistory";

export default function HistoryPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const { data: historyData, isLoading } = useHistory({ search: searchQuery });
    const deleteItem = useDeleteHistoryItem();
    const clearAll = useClearHistory();

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this recording?")) {
            deleteItem.mutate(id);
        }
    };

    const handleClear = () => {
        if (confirm("Delete ALL generation history? This cannot be undone.")) {
            clearAll.mutate(undefined);
        }
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return "0 KB";
        const kb = bytes / 1024;
        return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
    };

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="page-container-xl">
            {/* Header */}
            <div className="page-hero" style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <div style={{ width: 56, height: 56, background: "var(--accent-green)", border: "var(--border-thick)", boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Clock size={26} color="black" strokeWidth={3} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>Generation History</h1>
                        <p style={{ fontWeight: 600 }}>Your past audio clones and renders.</p>
                    </div>
                </div>

                <Button
                    variant="danger"
                    onClick={handleClear}
                    disabled={!historyData?.items.length || clearAll.isPending}
                    className="shadow-[4px_4px_0_#000]"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All History
                </Button>
            </div>

            {/* Search Bar */}
            <div style={{ position: "relative", marginBottom: "32px" }}>
                <Search
                    size={18}
                    style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#000", pointerEvents: "none" }}
                    strokeWidth={3}
                />
                <input
                    type="text"
                    className="input-field"
                    placeholder="Search by text, voice name, or language..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: "48px", fontWeight: 800, width: "100%", maxWidth: "500px" }}
                />
            </div>

            {/* History List */}
            <div className="glass-card" style={{ padding: "0" }}>
                {isLoading ? (
                    <div style={{ padding: "60px", textAlign: "center" }}>
                        <Loader2 size={40} className="spin" style={{ margin: "0 auto 16px", color: "var(--accent-purple)" }} strokeWidth={3} />
                        <p style={{ fontWeight: 900, textTransform: "uppercase" }}>Loading Time Logs...</p>
                    </div>
                ) : historyData?.items.length === 0 ? (
                    <div style={{ padding: "80px 40px", textAlign: "center" }}>
                        <Clock size={48} color="rgba(0,0,0,0.2)" style={{ margin: "0 auto 20px" }} strokeWidth={1} />
                        <h3 style={{ fontSize: "1.25rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "12px" }}>
                            {searchQuery ? "No Matches Found" : "History Empty"}
                        </h3>
                        <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>
                            {searchQuery ? "Try refining your search terms." : "You haven't generated any audio yet."}
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "var(--bg-secondary)", borderBottom: "var(--border-thin)" }}>
                                    <th style={{ padding: "16px 24px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Voice & Text</th>
                                    <th style={{ padding: "16px 24px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Generated</th>
                                    <th style={{ padding: "16px 24px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Settings</th>
                                    <th style={{ padding: "16px 24px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyData?.items.map((item) => (
                                    <React.Fragment key={item.id}>
                                        <tr style={{ borderBottom: "1px solid var(--bg-secondary)" }}>
                                            <td style={{ padding: "16px 24px", maxWidth: "400px" }}>
                                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                    <span style={{ fontWeight: 800 }}>{item.voice_name || "Deleted Voice"}</span>
                                                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                        &quot;{item.text}&quot;
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{new Date(item.createdAt).toLocaleDateString()}</span>
                                                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 800 }}>{new Date(item.createdAt).toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: "16px 24px" }}>
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                                    <span className="badge" style={{ background: "var(--accent-cyan)", fontSize: "0.65rem", padding: "4px 8px" }}>{item.language}</span>
                                                    <span className="badge" style={{ background: "var(--accent-pink)", fontSize: "0.65rem", padding: "4px 8px" }}>{item.emotion}</span>
                                                    <span className="badge" style={{ background: "var(--bg-primary)", fontSize: "0.65rem", padding: "4px 8px", color: "var(--text-muted)" }}>{formatDuration(item.duration_seconds)}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: "16px 24px", textAlign: "right", verticalAlign: "middle" }}>
                                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            const link = document.createElement('a');
                                                            link.href = item.audio_url;
                                                            link.download = `rendered_${item.id}.wav`;
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                        }}
                                                        className="h-8 w-8 text-slate-500 hover:text-blue-500 hover:bg-transparent"
                                                        title="Download Audio"
                                                    >
                                                        <Download size={16} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(item.id)}
                                                        className="h-8 w-8 text-slate-500 hover:text-red-500 hover:bg-transparent"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr style={{ borderBottom: "var(--border-thin)" }}>
                                            <td colSpan={4} style={{ padding: "0 24px 20px 24px", border: "none" }}>
                                                <AudioPlayer audioUrl={item.audio_url} label={`ID: ${item.id.split('-')[0]}`} showDownload={false} />
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
