"use client";

import React from "react";

interface ProgressBarProps {
    progress: number;        // 0-100
    isActive: boolean;       // Whether generation is in progress
    label?: string;          // e.g. "Generating..." or "Processing..."
    accentColor?: string;    // Gradient start color
    accentColorEnd?: string; // Gradient end color
}

export default function ProgressBar({
    progress,
    isActive,
    label = "Processing...",
    accentColor = "#8b5cf6",
    accentColorEnd,
}: ProgressBarProps) {
    const endColor = accentColorEnd || accentColor;

    if (!isActive && progress === 0) return null;

    return (
        <div style={{
            width: "100%",
            background: "rgba(15, 18, 35, 0.8)",
            border: `1px solid ${accentColor}25`,
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "16px",
            animation: "fadeIn 0.25s ease",
        }}>
            {/* Label + Percentage */}
            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: "10px",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {isActive && (
                        <div style={{
                            width: 8, height: 8, borderRadius: "50%",
                            background: accentColor,
                            boxShadow: `0 0 8px ${accentColor}`,
                            animation: "pulse 1.5s ease-in-out infinite",
                        }} />
                    )}
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#e2e8f0" }}>
                        {label}
                    </span>
                </div>
                <span style={{
                    fontSize: "0.88rem", fontWeight: 700,
                    color: progress >= 100 ? "#22c55e" : accentColor,
                    fontVariantNumeric: "tabular-nums",
                }}>
                    {Math.round(progress)}%
                </span>
            </div>

            {/* Bar */}
            <div style={{
                width: "100%", height: 6, borderRadius: 3,
                background: "rgba(255,255,255,0.06)",
                overflow: "hidden", position: "relative",
            }}>
                <div style={{
                    width: `${Math.min(progress, 100)}%`,
                    height: "100%", borderRadius: 3,
                    background: `linear-gradient(90deg, ${accentColor}, ${endColor})`,
                    transition: "width 0.5s ease",
                    position: "relative",
                }}>
                    {isActive && (
                        <div style={{
                            position: "absolute", inset: 0,
                            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
                            animation: "shimmer 1.5s infinite",
                        }} />
                    )}
                </div>
            </div>
        </div>
    );
}
