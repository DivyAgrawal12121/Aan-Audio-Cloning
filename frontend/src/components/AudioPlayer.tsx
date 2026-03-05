"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, Download, RotateCcw } from "lucide-react";

interface AudioPlayerProps {
    audioUrl: string | null;
    label?: string;
    showDownload?: boolean;
}

export default function AudioPlayer({
    audioUrl,
    label,
    showDownload = true,
}: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
    }, [audioUrl]);

    useEffect(() => {
        if (!audioUrl || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const drawBars = () => {
            const w = rect.width;
            const h = rect.height;
            ctx.clearRect(0, 0, w, h);

            const barCount = 60;
            const barWidth = w / barCount - 2;
            const progress = duration > 0 ? currentTime / duration : 0;

            for (let i = 0; i < barCount; i++) {
                const x = i * (barWidth + 2);
                const seed = Math.sin(i * 0.5 + (isPlaying ? Date.now() * 0.003 : 0)) * 0.5 + 0.5;
                const barH = 4 + seed * (h - 8);

                const isPassed = i / barCount <= progress;

                const gradient = ctx.createLinearGradient(x, h, x, h - barH);
                if (isPassed) {
                    gradient.addColorStop(0, "rgba(139, 92, 246, 0.8)");
                    gradient.addColorStop(1, "rgba(6, 182, 212, 0.6)");
                } else {
                    gradient.addColorStop(0, "rgba(139, 92, 246, 0.15)");
                    gradient.addColorStop(1, "rgba(139, 92, 246, 0.05)");
                }

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.roundRect(x, h - barH, barWidth, barH, 2);
                ctx.fill();
            }

            if (isPlaying) {
                animFrameRef.current = requestAnimationFrame(drawBars);
            }
        };

        drawBars();

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [audioUrl, isPlaying, currentTime, duration]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const handleDownload = () => {
        if (!audioUrl) return;
        const a = document.createElement("a");
        a.href = audioUrl;
        a.download = `voxforge_output_${Date.now()}.wav`;
        a.click();
    };

    if (!audioUrl) {
        return (
            <div
                className="glass-card"
                style={{
                    padding: "32px",
                    textAlign: "center",
                    opacity: 0.5,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        gap: "3px",
                        height: "40px",
                        marginBottom: "12px",
                    }}
                >
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: "3px",
                                height: `${10 + Math.sin(i * 0.8) * 15 + 15}%`,
                                background: "rgba(139, 92, 246, 0.2)",
                                borderRadius: "2px",
                            }}
                        />
                    ))}
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    {label || "No audio generated yet"}
                </p>
            </div>
        );
    }

    return (
        <div className="glass-card" style={{ padding: "20px 24px" }}>
            {label && (
                <p
                    className="section-label"
                    style={{ marginBottom: "14px" }}
                >
                    {label}
                </p>
            )}

            <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={() =>
                    setCurrentTime(audioRef.current?.currentTime || 0)
                }
                onLoadedMetadata={() =>
                    setDuration(audioRef.current?.duration || 0)
                }
                onEnded={() => setIsPlaying(false)}
            />

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                }}
            >
                {/* Play/Pause Button */}
                <button
                    onClick={togglePlay}
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                        border: "none",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "all 0.2s ease",
                        boxShadow: "0 4px 16px rgba(139, 92, 246, 0.3)",
                    }}
                    onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = "scale(1.08)")
                    }
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                    }
                >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: "2px" }} />}
                </button>

                {/* Waveform Canvas */}
                <div style={{ flex: 1 }}>
                    <canvas
                        ref={canvasRef}
                        style={{ width: "100%", height: "48px", display: "block" }}
                    />
                </div>

                {/* Time */}
                <span
                    style={{
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                        minWidth: "70px",
                        textAlign: "right",
                    }}
                >
                    {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    {showDownload && (
                        <button
                            onClick={handleDownload}
                            title="Download"
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: "8px",
                                background: "rgba(139, 92, 246, 0.08)",
                                border: "1px solid var(--border-subtle)",
                                color: "var(--text-secondary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
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
                            <Download size={15} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
