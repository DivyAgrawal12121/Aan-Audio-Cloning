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
                padding: compact ? "12px 16px" : "20px 24px",
                cursor: onSelect ? "pointer" : "default",
                background: isSelected ? "var(--bg-secondary)" : "#fff",
                border: "var(--border-thin)",
                boxShadow: isSelected ? "2px 2px 0px #000" : "4px 4px 0px #000",
                transform: isSelected ? "translate(2px, 2px)" : "none",
                transition: "all 0.1s ease",
                display: "flex",
                alignItems: "center",
                gap: "16px",
            }}
            onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.transform = "translate(-1px, -1px)"; e.currentTarget.style.boxShadow = "6px 6px 0px #000"; } }}
            onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "4px 4px 0px #000"; } }}
        >
            {/* Avatar */}
            <div
                style={{
                    width: compact ? 36 : 48,
                    height: compact ? 36 : 48,
                    background: isSelected ? "var(--accent-purple)" : "var(--accent-cyan)",
                    border: "2px solid #000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "2px 2px 0px #000"
                }}
            >
                <Mic
                    size={compact ? 16 : 22}
                    color="black"
                    strokeWidth={3}
                />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p
                    style={{
                        fontWeight: 900,
                        color: "#000",
                        fontSize: compact ? "0.85rem" : "1rem",
                        textTransform: "uppercase",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {voice.name}
                </p>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginTop: "2px",
                    }}
                >
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            color: "var(--text-muted)",
                            textTransform: "uppercase"
                        }}
                    >
                        <Globe size={11} strokeWidth={3} />
                        {voice.language}
                    </span>
                    <span
                        style={{
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            color: "var(--text-muted)",
                            textTransform: "uppercase"
                        }}
                    >
                        {timeAgo(voice.createdAt)}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                {onPreview && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPreview(voice);
                        }}
                        style={{
                            width: 34,
                            height: 34,
                            background: "var(--accent-green)",
                            border: "2px solid #000",
                            color: "black",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "2px 2px 0px #000",
                        }}
                    >
                        <Play size={14} strokeWidth={3} />
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(voice);
                        }}
                        style={{
                            width: 34,
                            height: 34,
                            background: "#ef4444",
                            border: "2px solid #000",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "2px 2px 0px #000",
                        }}
                    >
                        <Trash2 size={14} strokeWidth={3} />
                    </button>
                )}
            </div>
        </div>
    );
}
