"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    Cpu, ChevronDown, Check, Loader2, AlertCircle, X,
    HardDrive, Download, Zap,
} from "lucide-react";
import type { ModelInfo, ModelProgressEvent } from "@resound-studio/shared";
import { CAP_STYLE, PHASE_COLORS } from "@resound-studio/shared";
import { getModels, getModelLoadStreamUrl } from "@resound-studio/api";

function getVramColor(estimate: string): string {
    const num = parseFloat(estimate);
    if (num <= 2) return "#22c55e";
    if (num <= 5) return "#f59e0b";
    return "#ef4444";
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
function LoadingProgressBar({ progress }: { progress: ModelProgressEvent }) {
    const phaseColor = PHASE_COLORS[progress.phase] || "#a855f7";
    const showDownloadStats = progress.phase === "downloading" && progress.total_mb > 0;

    return (
        <div style={{
            background: "#fff",
            border: "var(--border-thin)",
            borderRadius: "4px",
            padding: "20px",
            margin: "0 24px 20px",
            boxShadow: "3px 3px 0px #000",
            animation: "fadeIn 0.2s ease",
        }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {progress.phase === "ready" ? (
                        <Check size={18} strokeWidth={3} color="#22c55e" />
                    ) : progress.phase === "error" ? (
                        <AlertCircle size={18} strokeWidth={3} color="#ef4444" />
                    ) : (
                        <Loader2 size={18} className="spin" color="#000" strokeWidth={3} />
                    )}
                    <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "#000", textTransform: "uppercase" }}>
                        {progress.model_name || "Loading..."}
                    </span>
                </div>
                <span style={{
                    fontSize: "0.9rem", fontWeight: 900, color: "#000",
                    fontVariantNumeric: "tabular-nums",
                    background: phaseColor,
                    padding: "2px 8px",
                    border: "2px solid #000",
                    boxShadow: "2px 2px 0px #000"
                }}>
                    {Math.round(progress.percent)}%
                </span>
            </div>

            {/* Progress Bar */}
            <div style={{
                width: "100%", height: "14px", border: "2px solid #000",
                background: "#eee", overflow: "hidden", marginBottom: "12px",
                boxShadow: "inset 2px 2px 0px rgba(0,0,0,0.1)"
            }}>
                <div style={{
                    width: `${progress.percent}%`, height: "100%",
                    background: phaseColor,
                    transition: "width 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                    borderRight: progress.percent > 0 ? "2px solid #000" : "none"
                }} />
            </div>

            {/* Status Message */}
            <p style={{ fontSize: "0.8rem", color: "#000", fontWeight: 600, marginBottom: showDownloadStats ? "12px" : 0 }}>
                {progress.message.toUpperCase()}
            </p>

            {/* Download Stats */}
            {showDownloadStats && (
                <div style={{
                    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px",
                    padding: "12px 0 0",
                    borderTop: "2px dashed #000",
                }}>
                    {[
                        { label: "DL", val: formatMB(progress.downloaded_mb), color: "var(--accent-cyan)" },
                        { label: "SIZE", val: formatMB(progress.total_mb), color: "#fff" },
                        { label: "SPD", val: progress.speed_mbps > 0 ? progress.speed_mbps.toFixed(1) + "MB/s" : "—", color: "var(--accent-pink)" },
                        { label: "ETA", val: formatETA(progress.eta_seconds), color: "var(--accent-amber)" }
                    ].map(stat => (
                        <div key={stat.label} style={{ background: stat.color, border: "2px solid #000", padding: "4px", boxShadow: "2px 2px 0px #000" }}>
                            <p style={{ fontSize: "0.55rem", fontWeight: 900, color: "#000", marginBottom: "1px" }}>{stat.label}</p>
                            <p style={{ fontSize: "0.75rem", fontWeight: 800, color: "#000" }}>{stat.val}</p>
                        </div>
                    ))}
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
    const [loadProgress, setLoadProgress] = useState<ModelProgressEvent | null>(null);

    const fetchModels = useCallback(async () => {
        try {
            const data = await getModels();
            setModels(data.models);
            setActiveModelId(data.active);
        } catch (e) { console.error("Failed to fetch models", e); }
    }, []);

    useEffect(() => { fetchModels(); }, [fetchModels]);

    /* ── SSE-based Model Loading ── */
    const handleSelectModel = async (modelId: string) => {
        if (modelId === activeModelId || isLoading) return;
        setIsLoading(true);
        setLoadProgress(null);

        try {
            const eventSource = new EventSource(getModelLoadStreamUrl(modelId));

            eventSource.onmessage = (event) => {
                const data: ModelProgressEvent = JSON.parse(event.data);
                setLoadProgress(data);
                if (data.phase === "ready") {
                    setActiveModelId(data.model_id);
                    eventSource.close();
                    setTimeout(() => {
                        setIsLoading(false);
                        setLoadProgress(null);
                        setIsOpen(false);
                    }, 1000);
                } else if (data.phase === "error") {
                    eventSource.close();
                    setTimeout(() => { setIsLoading(false); fetchModels(); }, 2000);
                }
            };
            eventSource.onerror = () => {
                eventSource.close();
                setIsLoading(false);
                fetchModels();
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
            <div style={{ padding: "0 8px" }}>
                <p style={{
                    fontSize: "0.65rem", fontWeight: 900, textTransform: "uppercase",
                    letterSpacing: "0.15em", color: "var(--text-muted)", marginBottom: "6px", paddingLeft: "4px",
                }}>
                    Active Engine
                </p>
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        width: "100%", display: "flex", alignItems: "center", gap: "10px",
                        padding: "12px",
                        background: activeModel ? "var(--accent-cyan)" : "#fff",
                        border: "var(--border-thin)",
                        borderRadius: "4px", color: "#000",
                        cursor: isLoading ? "wait" : "pointer",
                        boxShadow: "3px 3px 0px #000",
                        transition: "all 0.1s ease",
                        transform: isOpen ? "translate(2px, 2px)" : "none",
                    }}
                    onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "5px 5px 0px #000"; } }}
                    onMouseLeave={e => { if (!isLoading) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "3px 3px 0px #000"; } }}
                >
                    <div style={{
                        width: 28, height: 28, background: "#000",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <Cpu size={16} color={activeModel ? "var(--accent-cyan)" : "#fff"} strokeWidth={3} />
                    </div>
                    <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 900, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {isLoading ? "LOADING..." : activeModel?.name || "NONE"}
                        </div>
                    </div>
                    <ChevronDown size={14} color="#000" strokeWidth={3} />
                </button>
            </div>

            {/* ───── Modal ───── */}
            {isOpen && (
                <Portal>
                    <div
                        onClick={(e) => { if (e.target === e.currentTarget && !isLoading) setIsOpen(false); }}
                        style={{
                            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                            zIndex: 99999,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(253, 252, 238, 0.8)",
                            backdropFilter: "blur(4px)",
                            animation: "fadeIn 0.2s ease",
                        }}
                    >
                        <div style={{
                            width: "820px", maxWidth: "92vw", maxHeight: "85vh",
                            background: "var(--bg-primary)",
                            border: "var(--border-thick)",
                            borderRadius: "var(--sketchy-radius)",
                            boxShadow: "8px 8px 0px #000",
                            display: "flex", flexDirection: "column", overflow: "hidden"
                        }}>
                            {/* Header */}
                            <div style={{ padding: "24px 32px", borderBottom: "3px solid #000", background: "var(--accent-purple)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#000" }}>Select Engine</h2>
                                    <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#000", marginTop: "2px" }}>ONLY ONE ENGINE LOADS AT A TIME</p>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    style={{ background: "#fff", border: "var(--border-thin)", padding: "10px", boxShadow: "3px 3px 0px #000", cursor: "pointer" }}
                                >
                                    <X size={20} strokeWidth={3} />
                                </button>
                            </div>

                            {/* Progress */}
                            {loadProgress && <LoadingProgressBar progress={loadProgress} />}

                            {/* Grid */}
                            <div style={{ padding: "24px", overflowY: "auto", flex: 1, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
                                {Object.entries(models).map(([id, model]) => {
                                    const isActive = id === activeModelId;
                                    const isThisLoading = isLoading && loadProgress?.model_id === id;
                                    const vramColor = getVramColor(model.vram_estimate);

                                    return (
                                        <button
                                            key={id}
                                            onClick={() => handleSelectModel(id)}
                                            style={{
                                                background: isActive ? "var(--bg-secondary)" : "#fff",
                                                border: "var(--border-thin)",
                                                padding: "20px",
                                                textAlign: "left",
                                                boxShadow: isActive ? "2px 2px 0px #000" : "4px 4px 0px #000",
                                                transform: isActive ? "translate(2px, 2px)" : "none",
                                                cursor: isLoading ? "wait" : "pointer",
                                                transition: "all 0.1s ease",
                                                display: "flex", flexDirection: "column"
                                            }}
                                            onMouseEnter={e => { if (!isActive && !isLoading) { e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "6px 6px 0px #000"; } }}
                                            onMouseLeave={e => { if (!isActive && !isLoading) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "4px 4px 0px #000"; } }}
                                        >
                                            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginBottom: "10px" }}>
                                                <span style={{ fontSize: "1.1rem", fontWeight: 900 }}>{model.name.toUpperCase()}</span>
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                    {model.is_downloaded === false && (
                                                        <span style={{ fontSize: "0.55rem", fontWeight: 900, background: "#ef4444", color: "#fff", padding: "2px 6px", border: "2px solid #000", boxShadow: "2px 2px 0px #000" }}>MISSING</span>
                                                    )}
                                                    {isActive && <Check size={18} strokeWidth={4} color="var(--accent-green)" />}
                                                </div>
                                            </div>
                                            <p style={{ fontSize: "0.8rem", fontWeight: 500, color: "#333", marginBottom: "16px", flex: 1 }}>{model.description}</p>

                                            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                                                <div style={{ padding: "4px 10px", background: vramColor, border: "2px solid #000", fontSize: "0.7rem", fontWeight: 800, boxShadow: "2px 2px 0px #000" }}>VRAM {model.vram_estimate}</div>
                                                <div style={{ padding: "4px 10px", background: "#eee", border: "2px solid #000", fontSize: "0.7rem", fontWeight: 800, boxShadow: "2px 2px 0px #000" }}>{model.download_size}</div>
                                            </div>

                                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                                {model.capabilities.map(cap => (
                                                    <span key={cap} style={{
                                                        fontSize: "0.55rem", fontWeight: 900, padding: "2px 8px",
                                                        background: CAP_STYLE[cap]?.bg || "#ddd", border: "1px solid #000",
                                                        textTransform: "uppercase"
                                                    }}>
                                                        {CAP_STYLE[cap]?.label || cap}
                                                    </span>
                                                ))}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </>
    );
}
