"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Cpu, HardDrive, Zap, Check, X, Loader2,
    AlertCircle, Download, Trash2, Box, Gauge, RefreshCcw
} from "lucide-react";
import type { ModelInfo, ModelProgressEvent } from "@resound-studio/shared";
import { CAP_STYLE } from "@resound-studio/shared";
import { getModels, getModelLoadStreamUrl, unloadModel } from "@resound-studio/api";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface GPUStat {
    index: number;
    name: string;
    memory_used_mb: number;
    memory_total_mb: number;
    memory_free_mb: number;
    gpu_util_percent: number;
    memory_util_percent: number;
    driver?: string;
}

export default function ModelManagerPage() {
    const [models, setModels] = useState<Record<string, ModelInfo>>({});
    const [activeModelId, setActiveModelId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUnloading, setIsUnloading] = useState<string | null>(null);
    const [loadProgress, setLoadProgress] = useState<ModelProgressEvent | null>(null);
    const [gpuStats, setGpuStats] = useState<GPUStat[]>([]);
    const [gpuError, setGpuError] = useState<string | null>(null);
    const [isUnloadingAll, setIsUnloadingAll] = useState(false);

    const fetchModels = useCallback(async () => {
        try {
            const data = await getModels();
            setModels(data.models);
            setActiveModelId(data.active);
        } catch (e) {
            console.error("Failed to fetch models", e);
        }
    }, []);

    const fetchGpuStats = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/models/gpu-stats`);
            if (res.ok) {
                const data = await res.json();
                setGpuStats(data.gpus || []);
                setGpuError(data.error || null);
            }
        } catch (e) {
            console.error("Failed to fetch GPU stats", e);
            setGpuError("Failed to reach backend for GPU stats.");
        }
    }, []);

    useEffect(() => {
        fetchModels();
        fetchGpuStats();
        // Poll GPU stats every 3 seconds
        const interval = setInterval(fetchGpuStats, 3000);
        return () => clearInterval(interval);
    }, [fetchModels, fetchGpuStats]);

    const handleLoadModel = async (modelId: string) => {
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
                        fetchModels();
                        fetchGpuStats();
                    }, 1000);
                } else if (data.phase === "error") {
                    eventSource.close();
                    setTimeout(() => {
                        setIsLoading(false);
                        fetchModels();
                    }, 2000);
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

    const handleUnloadModel = async (modelId: string) => {
        if (isLoading || isUnloading) return;
        setIsUnloading(modelId);
        try {
            // Use the new specific unload endpoint
            const res = await fetch(`${API_BASE}/api/models/${modelId}/unload`, { method: "POST" });
            if (res.ok) {
                if (activeModelId === modelId) setActiveModelId(null);
                fetchModels();
                fetchGpuStats();
            }
        } catch (e) {
            console.error("Failed to unload model", e);
        } finally {
            setIsUnloading(null);
        }
    };

    const handleUnloadAll = async () => {
        if (isLoading || isUnloadingAll) return;
        if (!confirm("Are you sure you want to clear all models from GPU VRAM? This will stop any active generation.")) return;

        setIsUnloadingAll(true);
        try {
            const res = await fetch(`${API_BASE}/api/models/unload-all`, { method: "POST" });
            if (res.ok) {
                setActiveModelId(null);
                fetchModels();
                fetchGpuStats();
            }
        } catch (e) {
            console.error("Failed to unload all models", e);
        } finally {
            setIsUnloadingAll(false);
        }
    };

    return (
        <div className="page-container" style={{ padding: "40px" }}>
            {/* Header */}
            <header style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <div style={{
                        width: 64, height: 64, background: "var(--accent-purple)",
                        border: "var(--border-thick)", display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "6px 6px 0px #000"
                    }}>
                        <Cpu size={32} color="black" strokeWidth={3} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: "2.5rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em" }}>
                            Model Manager
                        </h1>
                        <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-muted)" }}>
                            Control GPU residency and monitor hardware performance.
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleUnloadAll}
                    disabled={isUnloadingAll || isLoading}
                    style={{
                        padding: "16px 24px", background: "#fee2e2", border: "var(--border-thick)",
                        boxShadow: "4px 4px 0px #000", fontWeight: 900, textTransform: "uppercase",
                        cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", color: "#b91c1c"
                    }}
                >
                    {isUnloadingAll ? <Loader2 size={18} className="spin" /> : <RefreshCcw size={18} />}
                    Unload All Models
                </button>
            </header>

            {/* GPU Real-time Stats */}
            <div style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <Gauge size={18} strokeWidth={3} />
                    <p style={{ fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Real-time Hardware Monitoring
                    </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
                    {gpuStats.length === 0 ? (
                        <div className="section-card" style={{ padding: "20px", background: "#fff5f5", border: "2px solid #ef4444" }}>
                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                <AlertCircle size={20} color="#ef4444" />
                                <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ef4444" }}>
                                    {gpuError || "NVIDIA GPU not detected."}
                                </p>
                            </div>
                            <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "#991b1b", marginTop: "8px" }}>
                                Try checking your driver installation or running with CUDA enabled.
                            </p>
                        </div>
                    ) : gpuStats.map(stat => (
                        <div key={stat.index} className="section-card" style={{ padding: "24px", position: "relative" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                                <span style={{ fontWeight: 900, fontSize: "0.9rem" }}>{stat.name}</span>
                                <span style={{ fontSize: "0.7rem", fontWeight: 800, background: "#000", color: "#fff", padding: "2px 8px" }}>
                                    GPU #{stat.index}
                                </span>
                            </div>

                            {/* VRAM Usage */}
                            <div style={{ marginBottom: "16px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 800, marginBottom: "6px" }}>
                                    <span>VRAM USAGE</span>
                                    <span>{stat.memory_used_mb}MB / {stat.memory_total_mb}MB</span>
                                </div>
                                <div style={{ width: "100%", height: "12px", background: "#f0f0f0", border: "2px solid #000" }}>
                                    <div style={{
                                        height: "100%", background: "var(--accent-cyan)",
                                        width: `${(stat.memory_used_mb / stat.memory_total_mb) * 100}%`,
                                        transition: "width 0.5s ease"
                                    }} />
                                </div>
                            </div>

                            {/* GPU Utilization */}
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 800, marginBottom: "6px" }}>
                                    <span>COMPUTE UTILIZATION</span>
                                    <span>{stat.gpu_util_percent}%</span>
                                </div>
                                <div style={{ width: "100%", height: "12px", background: "#f0f0f0", border: "2px solid #000" }}>
                                    <div style={{
                                        height: "100%", background: "var(--accent-purple)",
                                        width: `${stat.gpu_util_percent}%`,
                                        transition: "width 0.5s ease"
                                    }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Model Grid */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <Box size={18} strokeWidth={3} />
                <p style={{ fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>Available Engines</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "32px" }}>
                {Object.entries(models).map(([id, model]) => {
                    const isActive = id === activeModelId;
                    const isModelLoading = isLoading && loadProgress?.model_id === id;
                    const isModelUnloading = isUnloading === id;

                    return (
                        <div key={id} style={{
                            background: isActive ? "var(--bg-secondary)" : "white",
                            border: "var(--border-thick)",
                            padding: "32px",
                            boxShadow: isActive ? "4px 4px 0px #000" : "8px 8px 0px #000",
                            transition: "all 0.2s ease",
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
                            gap: "20px"
                        }}>
                            {/* Status Badge */}
                            <div style={{ position: "absolute", top: -12, right: 20 }}>
                                {isActive ? (
                                    <div style={{
                                        background: "var(--accent-green)", border: "var(--border-thin)",
                                        padding: "4px 12px", fontSize: "0.75rem", fontWeight: 900,
                                        boxShadow: "3px 3px 0px #000"
                                    }}>
                                        LOADED ON {model.device?.toUpperCase() || "UNK"}
                                    </div>
                                ) : (
                                    <div style={{
                                        background: "#eee", border: "var(--border-thin)",
                                        padding: "4px 12px", fontSize: "0.75rem", fontWeight: 900,
                                        boxShadow: "3px 3px 0px #000"
                                    }}>
                                        OFFLINE
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: "8px" }}>{model.name}</h3>
                                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#666", lineHeight: 1.4 }}>{model.description}</p>
                            </div>

                            {/* Stats */}
                            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                <div style={{
                                    background: "var(--accent-cyan)", border: "var(--border-thin)",
                                    padding: "6px 12px", fontSize: "0.7rem", fontWeight: 900,
                                    boxShadow: "2px 2px 0px #000"
                                }}>
                                    VRAM: {model.vram_estimate}
                                </div>
                                <div style={{
                                    background: "var(--accent-amber)", border: "var(--border-thin)",
                                    padding: "6px 12px", fontSize: "0.7rem", fontWeight: 900,
                                    boxShadow: "2px 2px 0px #000"
                                }}>
                                    DISK: {model.download_size}
                                </div>
                            </div>

                            {/* Capabilities */}
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                {model.capabilities.map(cap => (
                                    <span key={cap} style={{
                                        fontSize: "0.6rem", fontWeight: 900, padding: "4px 8px",
                                        background: CAP_STYLE[cap]?.bg || "#ddd", border: "1px solid #000",
                                        textTransform: "uppercase", boxShadow: "2px 2px 0px #000"
                                    }}>
                                        {CAP_STYLE[cap]?.label || cap}
                                    </span>
                                ))}
                            </div>

                            {/* Progress Bar (Inline) */}
                            {isModelLoading && loadProgress && (
                                <div style={{ marginTop: "10px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 900 }}>{loadProgress.phase.toUpperCase()}</span>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 900 }}>{Math.round(loadProgress.percent)}%</span>
                                    </div>
                                    <div style={{ width: "100%", height: "12px", border: "2px solid #000", background: "#eee" }}>
                                        <div style={{
                                            width: `${loadProgress.percent}%`, height: "100%",
                                            background: "var(--accent-purple)", transition: "width 0.3s ease"
                                        }} />
                                    </div>
                                    <p style={{ fontSize: "0.7rem", fontWeight: 700, marginTop: "6px" }}>{loadProgress.message}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ marginTop: "auto", display: "flex", gap: "16px" }}>
                                {!isActive ? (
                                    <button
                                        onClick={() => handleLoadModel(id)}
                                        disabled={isLoading}
                                        className="sketchy-btn"
                                        style={{
                                            flex: 1, padding: "14px", background: "var(--accent-green)",
                                            fontSize: "0.85rem", cursor: isLoading ? "wait" : "pointer",
                                        }}
                                    >
                                        {isModelLoading ? <Loader2 size={18} className="spin" /> : <Zap size={18} />}
                                        SWITCH TO ENGINE
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleUnloadModel(id)}
                                        disabled={isModelUnloading || isLoading}
                                        className="sketchy-btn"
                                        style={{
                                            flex: 1, padding: "14px", background: "var(--accent-pink)",
                                            fontSize: "0.85rem", cursor: (isModelUnloading || isLoading) ? "wait" : "pointer",
                                        }}
                                    >
                                        {isModelUnloading ? <Loader2 size={18} className="spin" /> : <Trash2 size={18} />}
                                        UNLOAD VRAM
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
