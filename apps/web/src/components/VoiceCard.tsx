"use client";

import React from "react";
import { Mic, Trash2, Play, Globe } from "lucide-react";
import type { SavedVoice } from "@/lib/types";

interface VoiceCardProps {
    voice: SavedVoice;
    isSelected?: boolean;
    onSelect?: (voice: SavedVoice) => void;
    onDelete?: (voice: SavedVoice) => void;
    onPreview?: (voice: SavedVoice) => void;
    compact?: boolean;
}

export default function VoiceCard({
    voice,
    isSelected = false,
    onSelect,
    onDelete,
    onPreview,
    compact = false,
}: VoiceCardProps) {
    const timeAgo = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div
            className="glass-card"
            onClick={() => onSelect?.(voice)}
            style={{
                padding: compact ? "14px 18px" : "20px 24px",
                cursor: onSelect ? "pointer" : "default",
                border: isSelected
                    ? "1px solid var(--accent-purple)"
                    : "1px solid var(--border-subtle)",
                background: isSelected
                    ? "rgba(139, 92, 246, 0.08)"
                    : "var(--bg-glass)",
                transition: "all 0.25s ease",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: compact ? "12px" : "16px",
                }}
            >
                {/* Avatar */}
                <div
                    style={{
                        width: compact ? 38 : 48,
                        height: compact ? 38 : 48,
                        borderRadius: compact ? "10px" : "14px",
                        background: isSelected
                            ? "linear-gradient(135deg, #8b5cf6, #6366f1)"
                            : "rgba(139, 92, 246, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.3s ease",
                    }}
                >
                    <Mic
                        size={compact ? 16 : 20}
                        color={isSelected ? "white" : "#8b5cf6"}
                    />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                        style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            fontSize: compact ? "0.88rem" : "0.95rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {voice.name}
                    </p>
                    {!compact && voice.description && (
                        <p
                            style={{
                                fontSize: "0.8rem",
                                color: "var(--text-muted)",
                                marginTop: "2px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {voice.description}
                        </p>
                    )}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginTop: compact ? "2px" : "6px",
                        }}
                    >
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "0.72rem",
                                color: "var(--text-muted)",
                            }}
                        >
                            <Globe size={11} />
                            {voice.language}
                        </span>
                        <span
                            style={{
                                fontSize: "0.72rem",
                                color: "var(--text-muted)",
                            }}
                        >
                            {timeAgo(voice.createdAt)}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    {onPreview && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onPreview(voice);
                            }}
                            title="Preview"
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: "8px",
                                background: "rgba(6, 182, 212, 0.08)",
                                border: "1px solid rgba(6, 182, 212, 0.15)",
                                color: "#06b6d4",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "rgba(6, 182, 212, 0.15)")
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "rgba(6, 182, 212, 0.08)")
                            }
                        >
                            <Play size={13} />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(voice);
                            }}
                            title="Delete"
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: "8px",
                                background: "rgba(239, 68, 68, 0.06)",
                                border: "1px solid rgba(239, 68, 68, 0.1)",
                                color: "#ef4444",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)")
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "rgba(239, 68, 68, 0.06)")
                            }
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* Tags */}
            {!compact && voice.tags && voice.tags.length > 0 && (
                <div
                    style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                        marginTop: "12px",
                    }}
                >
                    {voice.tags.map((tag) => (
                        <span
                            key={tag}
                            className="tag"
                            style={{ fontSize: "0.7rem", padding: "4px 10px" }}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
