"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    Cpu, ChevronDown, Check, Loader2, AlertCircle, X,
    HardDrive, Download, Zap, Clock, Wifi,
} from "lucide-react";

/* ─── Types ─── */
interface ModelInfo {
    name: string;
    description: string;
    vram_estimate: string;
    download_size: string;
    capabilities: string[];
    features: string[];
}

interface ModelsResponse {
    active: string;
    models: Record<string, ModelInfo>;
}

interface ProgressEvent {
    phase: string;
    percent: number;
    message: string;
    downloaded_mb: number;
    total_mb: number;
    speed_mbps: number;
    eta_seconds: number;
    model_id: string;
    model_name: string;
}

/* ─── Capability Tag Styles ─── */
const CAP_STYLE: Record<string, { label: string; color: string; bg: string }> = {
    clone: { label: "Clone", color: "#a78bfa", bg: "rgba(139,92,246,0.14)" },
    generate: { label: "TTS", color: "#22d3ee", bg: "rgba(6,182,212,0.14)" },
    design: { label: "Design", color: "#f472b6", bg: "rgba(236,72,153,0.14)" },
    foley: { label: "Foley", color: "#34d399", bg: "rgba(16,185,129,0.14)" },
    music: { label: "Music", color: "#fbbf24", bg: "rgba(245,158,11,0.14)" },
    emotion: { label: "Emotion", color: "#fb7185", bg: "rgba(244,63,94,0.14)" },
    cross_lingual: { label: "Multilingual", color: "#60a5fa", bg: "rgba(59,130,246,0.14)" },
    speed: { label: "Fast", color: "#4ade80", bg: "rgba(34,197,94,0.14)" },
};

const PHASE_COLORS: Record<string, string> = {
    unloading: "#f59e0b",
    importing: "#8b5cf6",
    downloading: "#3b82f6",
    loading_gpu: "#06b6d4",
    ready: "#22c55e",
    error: "#ef4444",
};

function getVramColor(estimate: string): string {
    const num = parseFloat(estimate);
    if (num <= 2) return "#4ade80";
    if (num <= 5) return "#fbbf24";
    return "#f87171";
}

function formatMB(mb: number): string {
    if (mb >= 1024) return (mb / 1024).toFixed(1) + " GB";
    return mb.toFixed(0) + " MB";
}

function formatETA(seconds: number): string {
    if (seconds <= 0) return "—";
    if (seconds < 60) return Math.ceil(seconds) + "s";
    return Math.floor(seconds / 60) + "m " + Math.ceil(seconds % 60) + "s";
}

/* ─── Portal ─── */
function Portal({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;
    return createPortal(children, document.body);
}

/* ─── Progress Bar Component ─── */
function LoadingProgressBar({ progress }: { progress: ProgressEvent }) {
    const phaseColor = PHASE_COLORS[progress.phase] || "#8b5cf6";
    const showDownloadStats = progress.phase === "downloading" && progress.total_mb > 0;

    return (
        <div style={{
            background: "rgba(15, 18, 35, 0.95)",
            border: `1px solid ${phaseColor}30`,
            borderRadius: "16px",
            padding: "24px",
            margin: "0 24px 16px",
            animation: "fadeIn 0.3s ease",
        }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {progress.phase === "ready" ? (
                        <Check size={16} color="#22c55e" />
                    ) : progress.phase === "error" ? (
                        <AlertCircle size={16} color="#ef4444" />
                    ) : (
                        <Loader2 size={16} className="spin" color={phaseColor} />
                    )}
                    <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "white" }}>
                        {progress.model_name || "Loading..."}
                    </span>
                </div>
                <span style={{
                    fontSize: "0.85rem", fontWeight: 700, color: phaseColor,
                    fontVariantNumeric: "tabular-nums",
                }}>
                    {Math.round(progress.percent)}%
                </span>
            </div>

            {/* Progress Bar */}
            <div style={{
                width: "100%", height: "8px", borderRadius: "4px",
                background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: "12px",
                position: "relative",
            }}>
                <div style={{
                    width: `${progress.percent}%`, height: "100%", borderRadius: "4px",
                    background: `linear-gradient(90deg, ${phaseColor}90, ${phaseColor})`,
                    transition: "width 0.4s ease",
                    position: "relative",
                }}>
                    {/* Animated shimmer */}
                    <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
                        animation: progress.phase !== "ready" && progress.phase !== "error" ? "shimmer 1.5s infinite" : "none",
                    }} />
                </div>
            </div>

            {/* Status Message */}
            <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: showDownloadStats ? "12px" : 0 }}>
                {progress.message}
            </p>

            {/* Download Stats */}
            {showDownloadStats && (
                <div style={{
                    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px",
                    padding: "10px 0 0",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                }}>
                    <div>
                        <p style={{ fontSize: "0.6rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Downloaded</p>
                        <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#3b82f6", fontVariantNumeric: "tabular-nums" }}>
                            {formatMB(progress.downloaded_mb)}
                        </p>
                    </div>
                    <div>
                        <p style={{ fontSize: "0.6rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Total</p>
                        <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>
                            {formatMB(progress.total_mb)}
                        </p>
                    </div>
                    <div>
                        <p style={{ fontSize: "0.6rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Speed</p>
                        <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#22d3ee", fontVariantNumeric: "tabular-nums" }}>
                            {progress.speed_mbps > 0 ? progress.speed_mbps.toFixed(1) + " MB/s" : "—"}
                        </p>
                    </div>
                    <div>
                        <p style={{ fontSize: "0.6rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>ETA</p>
                        <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fbbf24", fontVariantNumeric: "tabular-nums" }}>
                            {formatETA(progress.eta_seconds)}
                        </p>
                    </div>
                </div>
            )}

            {/* GPU Loading Phase Stats */}
            {progress.phase === "loading_gpu" && (
                <div style={{
                    display: "flex", gap: "16px", paddingTop: "10px",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Zap size={12} color="#06b6d4" />
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Allocating GPU VRAM</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <HardDrive size={12} color="#06b6d4" />
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{formatMB(progress.total_mb)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════ */
/*  ModelSelector Main Component      */
/* ═══════════════════════════════════ */
export default function ModelSelector() {
    const [isOpen, setIsOpen] = useState(false);
    const [models, setModels] = useState<Record<string, ModelInfo>>({});
    const [activeModelId, setActiveModelId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadProgress, setLoadProgress] = useState<ProgressEvent | null>(null);

    const fetchModels = useCallback(async () => {
        try {
            const res = await fetch("http://localhost:8000/api/models");
            if (res.ok) {
                const data: ModelsResponse = await res.json();
                setModels(data.models);
                setActiveModelId(data.active);
            }
        } catch (e) { console.error("Failed to fetch models", e); }
    }, []);

    useEffect(() => { fetchModels(); }, [fetchModels]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !isLoading) setIsOpen(false); };
        if (isOpen) window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, isLoading]);

    /* ── SSE-based Model Loading ── */
    const handleSelectModel = async (modelId: string) => {
        if (modelId === activeModelId || isLoading) return;
        setIsLoading(true);
        setLoadProgress(null);

        try {
            const eventSource = new EventSource(
                `http://localhost:8000/api/models/load-stream?model_id=${encodeURIComponent(modelId)}`
            );

            eventSource.onmessage = (event) => {
                try {
                    const data: ProgressEvent = JSON.parse(event.data);
                    setLoadProgress(data);

                    if (data.phase === "ready") {
                        setActiveModelId(data.model_id);
                        eventSource.close();
                        // Keep the success state visible briefly
                        setTimeout(() => {
                            setIsLoading(false);
                            setLoadProgress(null);
                            setIsOpen(false);
                        }, 1200);
                    } else if (data.phase === "error") {
                        eventSource.close();
                        setTimeout(() => {
                            setIsLoading(false);
                            fetchModels();
                        }, 3000);
                    }
                } catch (e) { console.error("SSE parse error", e); }
            };

            eventSource.onerror = () => {
                eventSource.close();
                setLoadProgress({
                    phase: "error", percent: 0, message: "Connection lost to server",
                    downloaded_mb: 0, total_mb: 0, speed_mbps: 0, eta_seconds: 0,
                    model_id: modelId, model_name: models[modelId]?.name || modelId,
                });
                setTimeout(() => {
                    setIsLoading(false);
                    fetchModels();
                }, 3000);
            };
        } catch (e) {
            console.error(e);
            setIsLoading(false);
            fetchModels();
        }
    };

    const activeModel = activeModelId ? models[activeModelId] : null;

    return (
        <>
            {/* ───── Sidebar Trigger ───── */}
            <div style={{ padding: "0 12px" }}>
                <p style={{
                    fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase",
                    letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: "6px", paddingLeft: "4px",
                }}>
                    Active Engine
                </p>
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        width: "100%", display: "flex", alignItems: "center", gap: "8px",
                        padding: "10px 12px",
                        background: activeModel
                            ? "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(6,182,212,0.05))"
                            : "rgba(25, 30, 50, 0.6)",
                        border: activeModel ? "1px solid rgba(139,92,246,0.22)" : "1px solid var(--border-subtle)",
                        borderRadius: "8px", color: "white",
                        cursor: isLoading ? "wait" : "pointer",
                        transition: "all 0.2s ease",
                    }}
                >
                    {isLoading ? (
                        <Loader2 size={15} className="spin" color="var(--accent-purple)" />
                    ) : (
                        <div style={{
                            width: 24, height: 24, borderRadius: "6px", flexShrink: 0,
                            background: activeModel ? "linear-gradient(135deg, #8b5cf6, #06b6d4)" : "rgba(100,116,139,0.3)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <Cpu size={12} color="white" />
                        </div>
                    )}
                    <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                        <div style={{ fontSize: "0.76rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {isLoading ? "Loading..." : activeModel?.name || "No Model Loaded"}
                        </div>
                        {activeModel && !isLoading && (
                            <div style={{ fontSize: "0.58rem", color: getVramColor(activeModel.vram_estimate), marginTop: "1px" }}>
                                ● VRAM {activeModel.vram_estimate}
                            </div>
                        )}
                        {isLoading && loadProgress && (
                            <div style={{ fontSize: "0.58rem", color: PHASE_COLORS[loadProgress.phase] || "#8b5cf6", marginTop: "1px" }}>
                                {Math.round(loadProgress.percent)}% — {loadProgress.phase.replace("_", " ")}
                            </div>
                        )}
                    </div>
                    <ChevronDown size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                </button>
            </div>

            {/* ───── Modal via Portal ───── */}
            {isOpen && (
                <Portal>
                    <div
                        onClick={(e) => { if (e.target === e.currentTarget && !isLoading) setIsOpen(false); }}
                        style={{
                            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                            zIndex: 99999,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(0, 0, 0, 0.7)",
                            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                            animation: "modalFadeIn 0.18s ease",
                        }}
                    >
                        <div style={{
                            width: "820px", maxWidth: "92vw", maxHeight: "85vh",
                            background: "linear-gradient(180deg, #0f1225 0%, #090b18 100%)",
                            border: "1px solid rgba(139, 92, 246, 0.18)",
                            borderRadius: "20px", overflow: "hidden",
                            boxShadow: "0 30px 100px rgba(0, 0, 0, 0.7), 0 0 80px rgba(139, 92, 246, 0.06)",
                            animation: "modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                            display: "flex", flexDirection: "column",
                        }}>
                            {/* Header */}
                            <div style={{
                                padding: "22px 28px", flexShrink: 0,
                                display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                                borderBottom: "1px solid rgba(139,92,246,0.1)",
                                background: "rgba(139,92,246,0.02)",
                            }}>
                                <div>
                                    <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f1f5f9", marginBottom: "5px", display: "flex", alignItems: "center", gap: "8px" }}>
                                        <Cpu size={18} color="#8b5cf6" /> Choose AI Engine
                                    </h2>
                                    <p style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: "5px" }}>
                                        <AlertCircle size={12} /> Only one model loads into GPU VRAM at a time
                                    </p>
                                </div>
                                <button
                                    onClick={() => { if (!isLoading) setIsOpen(false); }}
                                    disabled={isLoading}
                                    style={{
                                        width: 34, height: 34, borderRadius: "10px", flexShrink: 0,
                                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                                        color: isLoading ? "#334155" : "#64748b", cursor: isLoading ? "not-allowed" : "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        transition: "all 0.15s ease",
                                    }}
                                    onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.color = "#f87171"; } }}
                                    onMouseLeave={e => { if (!isLoading) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#64748b"; } }}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Live Progress Bar (shows during loading) */}
                            {loadProgress && (
                                <LoadingProgressBar progress={loadProgress} />
                            )}

                            {/* Model Grid */}
                            <div style={{
                                padding: "20px 24px", overflowY: "auto", flex: 1,
                                display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px",
                            }}>
                                {Object.entries(models).map(([id, model]) => {
                                    const isActive = id === activeModelId;
                                    const isThisLoading = isLoading && loadProgress?.model_id === id;
                                    const vramColor = getVramColor(model.vram_estimate);

                                    return (
                                        <button
                                            key={id}
                                            onClick={() => handleSelectModel(id)}
                                            disabled={isLoading}
                                            style={{
                                                display: "flex", flexDirection: "column",
                                                padding: "18px 20px",
                                                background: isThisLoading
                                                    ? `linear-gradient(135deg, ${PHASE_COLORS[loadProgress?.phase || "downloading"]}08, transparent)`
                                                    : isActive
                                                        ? "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(6,182,212,0.04))"
                                                        : "rgba(255,255,255,0.015)",
                                                border: isThisLoading
                                                    ? `1.5px solid ${PHASE_COLORS[loadProgress?.phase || "downloading"]}40`
                                                    : isActive
                                                        ? "1.5px solid rgba(139,92,246,0.35)"
                                                        : "1px solid rgba(255,255,255,0.06)",
                                                borderRadius: "14px", color: "white",
                                                cursor: isLoading ? "not-allowed" : "pointer",
                                                textAlign: "left", transition: "all 0.25s ease",
                                                position: "relative", overflow: "hidden",
                                                opacity: isLoading && !isThisLoading && !isActive ? 0.4 : 1,
                                            }}
                                            onMouseEnter={e => {
                                                if (!isActive && !isLoading) {
                                                    e.currentTarget.style.background = "rgba(139,92,246,0.06)";
                                                    e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)";
                                                    e.currentTarget.style.transform = "translateY(-1px)";
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (!isActive && !isThisLoading) {
                                                    e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                                                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                                                    e.currentTarget.style.transform = "translateY(0)";
                                                }
                                            }}
                                        >
                                            {/* Active glow */}
                                            {(isActive || isThisLoading) && (
                                                <div style={{
                                                    position: "absolute", top: "-15px", right: "-15px",
                                                    width: "70px", height: "70px",
                                                    background: isThisLoading
                                                        ? `${PHASE_COLORS[loadProgress?.phase || "downloading"]}30`
                                                        : "rgba(139,92,246,0.2)",
                                                    borderRadius: "50%", filter: "blur(25px)", pointerEvents: "none",
                                                }} />
                                            )}

                                            {/* Name + Status */}
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "8px", position: "relative" }}>
                                                <span style={{ fontSize: "0.92rem", fontWeight: 700, color: isActive ? "#c4b5fd" : "#e2e8f0" }}>
                                                    {model.name}
                                                </span>
                                                {isActive && !isThisLoading && (
                                                    <span style={{
                                                        display: "inline-flex", alignItems: "center", gap: "3px",
                                                        fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.03em",
                                                        color: "#4ade80", background: "rgba(34,197,94,0.12)",
                                                        padding: "3px 9px", borderRadius: "10px",
                                                        border: "1px solid rgba(34,197,94,0.2)",
                                                    }}>
                                                        <Check size={10} strokeWidth={3} /> LOADED
                                                    </span>
                                                )}
                                                {isThisLoading && (
                                                    <Loader2 size={16} className="spin" color={PHASE_COLORS[loadProgress?.phase || "downloading"]} />
                                                )}
                                            </div>

                                            {/* Description */}
                                            <p style={{ fontSize: "0.76rem", color: "#94a3b8", lineHeight: 1.45, marginBottom: "12px", flex: 1 }}>
                                                {model.description}
                                            </p>

                                            {/* VRAM + Download badges */}
                                            <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                                                <div style={{
                                                    display: "inline-flex", alignItems: "center", gap: "4px",
                                                    fontSize: "0.68rem", fontWeight: 600,
                                                    color: vramColor, background: `${vramColor}14`,
                                                    padding: "4px 10px", borderRadius: "6px",
                                                    border: `1px solid ${vramColor}25`,
                                                }}>
                                                    <HardDrive size={11} /> {model.vram_estimate}
                                                </div>
                                                {model.download_size && (
                                                    <div style={{
                                                        display: "inline-flex", alignItems: "center", gap: "4px",
                                                        fontSize: "0.68rem", fontWeight: 500,
                                                        color: "#64748b", background: "rgba(255,255,255,0.03)",
                                                        padding: "4px 10px", borderRadius: "6px",
                                                        border: "1px solid rgba(255,255,255,0.05)",
                                                    }}>
                                                        <Download size={11} /> {model.download_size}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Capability Tags */}
                                            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                                                {(model.capabilities || []).map(cap => {
                                                    const s = CAP_STYLE[cap] || { label: cap, color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
                                                    return (
                                                        <span key={cap} style={{
                                                            fontSize: "0.62rem", fontWeight: 600,
                                                            padding: "3px 8px", borderRadius: "5px",
                                                            color: s.color, background: s.bg,
                                                        }}>
                                                            {s.label}
                                                        </span>
                                                    );
                                                })}
                                            </div>

                                            {/* Per-card mini progress bar when this specific model is loading */}
                                            {isThisLoading && loadProgress && (
                                                <div style={{
                                                    position: "absolute", bottom: 0, left: 0, right: 0, height: "3px",
                                                    background: "rgba(255,255,255,0.05)",
                                                }}>
                                                    <div style={{
                                                        height: "100%", width: `${loadProgress.percent}%`,
                                                        background: PHASE_COLORS[loadProgress.phase] || "#8b5cf6",
                                                        transition: "width 0.4s ease",
                                                    }} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            <style jsx global>{`
                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(24px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    );
}
