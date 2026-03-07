"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Cpu, HardDrive, Zap, Check, X, Loader2,
    AlertCircle, Download, Trash2, Box
} from "lucide-react";
import type { ModelInfo, ModelProgressEvent } from "@resound-studio/shared";
import { CAP_STYLE } from "@resound-studio/shared";
import { getModels, getModelLoadStreamUrl, unloadModel } from "@resound-studio/api";

export default function ModelManagerPage() {
    const [models, setModels] = useState<Record<string, ModelInfo>>({});
    const [activeModelId, setActiveModelId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUnloading, setIsUnloading] = useState<string | null>(null);
    const [loadProgress, setLoadProgress] = useState<ModelProgressEvent | null>(null);

    const fetchModels = useCallback(async () => {
        try {
            const data = await getModels();
            setModels(data.models);
            setActiveModelId(data.active);
        } catch (e) {
            console.error("Failed to fetch models", e);
        }
    }, []);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

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
            await unloadModel(modelId);
            if (activeModelId === modelId) setActiveModelId(null);
            fetchModels();
        } catch (e) {
            console.error("Failed to unload model", e);
        } finally {
            setIsUnloading(null);
        }
    };

    return (
        <div className="page-container" style={{ padding: "40px" }}>
            {/* Header */}
            <header style={{ marginBottom: "48px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "16px" }}>
                    <div style={{
                        width: 64, height: 64, background: "var(--accent-purple)",
                        border: "var(--border-thick)", borderRadius: "var(--sketchy-radius)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "6px 6px 0px #000"
                    }}>
                        <Cpu size={32} color="black" strokeWidth={3} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: "2.5rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em" }}>
                            Model Manager
                        </h1>
                        <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-muted)" }}>
                            Control GPU VRAM residency and model switching
                        </p>
                    </div>
                </div>
            </header>

            {/* Model Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "32px" }}>
                {Object.entries(models).map(([id, model]) => {
                    const isActive = id === activeModelId;
                    const isModelLoading = isLoading && loadProgress?.model_id === id;
                    const isModelUnloading = isUnloading === id;

                    return (
                        <div key={id} style={{
                            background: isActive ? "var(--bg-secondary)" : "white",
                            border: "var(--border-thick)",
                            borderRadius: "var(--sketchy-radius)",
                            padding: "32px",
                            boxShadow: isActive ? "6px 6px 0px #000" : "10px 10px 0px #000",
                            transition: "all 0.2s ease",
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
                            gap: "20px"
                        }}>
                            {/* Status Badge */}
                            <div style={{ position: "absolute", top: -15, right: 20 }}>
                                {isActive ? (
                                    <div style={{
                                        background: "var(--accent-green)", border: "var(--border-thin)",
                                        padding: "4px 12px", fontSize: "0.75rem", fontWeight: 900,
                                        boxShadow: "3px 3px 0px #000", transform: "rotate(2deg)"
                                    }}>
                                        LOADED & ACTIVE
                                    </div>
                                ) : (
                                    <div style={{
                                        background: "#eee", border: "var(--border-thin)",
                                        padding: "4px 12px", fontSize: "0.75rem", fontWeight: 900,
                                        boxShadow: "3px 3px 0px #000", transform: "rotate(-1deg)"
                                    }}>
                                        NOT LOADED
                                    </div>
                                )}
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                <div>
                                    <h3 style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: "8px" }}>{model.name}</h3>
                                    <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#666", lineHeight: 1.4 }}>{model.description}</p>
                                </div>
                            </div>

                            {/* Stats */}
                            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                <div style={{
                                    background: "var(--accent-cyan)", border: "var(--border-thin)",
                                    padding: "6px 12px", fontSize: "0.8rem", fontWeight: 900,
                                    boxShadow: "3px 3px 0px #000"
                                }}>
                                    VRAM: {model.vram_estimate}
                                </div>
                                <div style={{
                                    background: "var(--accent-amber)", border: "var(--border-thin)",
                                    padding: "6px 12px", fontSize: "0.8rem", fontWeight: 900,
                                    boxShadow: "3px 3px 0px #000"
                                }}>
                                    DISK: {model.download_size}
                                </div>
                            </div>

                            {/* Capabilities */}
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                {model.capabilities.map(cap => (
                                    <span key={cap} style={{
                                        fontSize: "0.65rem", fontWeight: 900, padding: "4px 10px",
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
                                        style={{
                                            flex: 1, padding: "14px", background: "var(--accent-green)",
                                            border: "var(--border-thin)", fontWeight: 900, cursor: isLoading ? "wait" : "pointer",
                                            boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                            transition: "all 0.1s ease"
                                        }}
                                        onMouseEnter={e => { if (!isLoading) e.currentTarget.style.transform = "translate(-2px, -2px)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}
                                    >
                                        {isModelLoading ? <Loader2 size={18} className="spin" /> : <Zap size={18} />}
                                        LOAD TO GPU
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleUnloadModel(id)}
                                        disabled={isModelUnloading || isLoading}
                                        style={{
                                            flex: 1, padding: "14px", background: "var(--accent-pink)",
                                            border: "var(--border-thin)", fontWeight: 900, cursor: (isModelUnloading || isLoading) ? "wait" : "pointer",
                                            boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                            transition: "all 0.1s ease"
                                        }}
                                        onMouseEnter={e => { if (!isModelUnloading && !isLoading) e.currentTarget.style.transform = "translate(-2px, -2px)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}
                                    >
                                        {isModelUnloading ? <Loader2 size={18} className="spin" /> : <Trash2 size={18} />}
                                        UNLOAD FROM GPU
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
