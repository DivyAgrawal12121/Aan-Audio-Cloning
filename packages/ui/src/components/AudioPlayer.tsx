"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, Download, Volume2, Waves } from "lucide-react";

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

            const barCount = 45;
            const barWidth = w / barCount - 3;
            const progress = duration > 0 ? currentTime / duration : 0;

            for (let i = 0; i < barCount; i++) {
                const x = i * (barWidth + 3);
                const seed = Math.sin(i * 0.4 + (isPlaying ? Date.now() * 0.004 : 0)) * 0.5 + 0.5;
                const barH = 2 + seed * (h - 4);

                const isPassed = i / barCount <= progress;

                ctx.fillStyle = isPassed ? "#000" : "rgba(0,0,0,0.15)";

                // Draw sketchy-like blocks
                ctx.fillRect(x, h - barH, barWidth, barH);
                if (isPassed) {
                    ctx.strokeStyle = "#000";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, h - barH, barWidth, barH);
                }
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
        a.download = `resound-studio_${Date.now()}.wav`;
        a.click();
    };

    if (!audioUrl) {
        return (
            <div
                className="glass-card"
                style={{
                    padding: "24px",
                    textAlign: "center",
                    background: "var(--bg-secondary)",
                    opacity: 0.6,
                }}
            >
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
                    <Waves size={32} color="black" strokeWidth={1} />
                </div>
                <p style={{ fontSize: "0.75rem", fontWeight: 800, color: "#000", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {label || "No Audio Data"}
                </p>
            </div>
        );
    }

    return (
        <div className="glass-card" style={{ padding: "20px 24px", background: "#fff" }}>
            {label && (
                <p
                    style={{
                        fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase",
                        letterSpacing: "0.15em", marginBottom: "16px", color: "var(--text-muted)"
                    }}
                >
                    {label}
                </p>
            )}

            <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                onEnded={() => setIsPlaying(false)}
            />

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                }}
            >
                {/* Play Button */}
                <button
                    onClick={togglePlay}
                    style={{
                        width: 48,
                        height: 48,
                        background: isPlaying ? "var(--accent-pink)" : "var(--accent-cyan)",
                        border: "var(--border-thin)",
                        color: "black",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                        boxShadow: "3px 3px 0px #000",
                        transition: "all 0.1s ease",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "5px 5px 0px #000"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "3px 3px 0px #000"; }}
                >
                    {isPlaying ? <Pause size={20} strokeWidth={3} /> : <Play size={20} style={{ marginLeft: "2px" }} strokeWidth={3} />}
                </button>

                {/* Waveform */}
                <div style={{ flex: 1, height: "40px", borderBottom: "2px dashed #000", position: "relative" }}>
                    <canvas
                        ref={canvasRef}
                        style={{ width: "100%", height: "100%", display: "block" }}
                    />
                </div>

                {/* Time */}
                <div style={{ minWidth: "80px", textAlign: "right" }}>
                    <p style={{ fontSize: "0.85rem", fontWeight: 900, color: "#000", fontVariantNumeric: "tabular-nums" }}>
                        {formatTime(currentTime)}
                    </p>
                    <p style={{ fontSize: "0.6rem", fontWeight: 800, color: "var(--text-muted)" }}>
                        {formatTime(duration)}
                    </p>
                </div>

                {/* Actions */}
                {showDownload && (
                    <button
                        onClick={handleDownload}
                        style={{
                            width: 40,
                            height: 40,
                            background: "var(--accent-amber)",
                            border: "var(--border-thin)",
                            color: "black",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "3px 3px 0px #000",
                        }}
                    >
                        <Download size={18} strokeWidth={3} />
                    </button>
                )}
            </div>
        </div>
    );
}
