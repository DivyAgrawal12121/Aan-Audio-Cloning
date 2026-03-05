"use client";

import React, { useState, useEffect } from "react";
import { Settings, Server, Cpu, HardDrive, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

interface HealthData {
    status: string;
    model_loaded: boolean;
    device: string;
}

export default function SettingsPage() {
    const [backendUrl, setBackendUrl] = useState("http://localhost:8000");
    const [health, setHealth] = useState<HealthData | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const checkHealth = async () => {
        setIsChecking(true);
        try {
            const res = await fetch(`${backendUrl}/health`);
            const data = await res.json();
            setHealth(data);
            setIsConnected(true);
        } catch {
            setHealth(null);
            setIsConnected(false);
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        checkHealth();
    }, []);

    return (
        <div style={{ maxWidth: "700px" }}>
            {/* Header */}
            <div style={{ marginBottom: "36px" }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        marginBottom: "12px",
                    }}
                >
                    <div
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: "14px",
                            background: "linear-gradient(135deg, #64748b, #475569)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Settings size={22} color="white" />
                    </div>
                    <div>
                        <h1
                            style={{
                                fontSize: "1.8rem",
                                fontWeight: 800,
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Settings
                        </h1>
                        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                            Configure backend connection and model settings
                        </p>
                    </div>
                </div>
            </div>

            {/* Backend Connection */}
            <div
                className="glass-card"
                style={{ padding: "28px", marginBottom: "20px" }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "20px",
                    }}
                >
                    <Server size={16} color="var(--accent-purple)" />
                    <p className="section-label" style={{ margin: 0 }}>
                        Backend Connection
                    </p>
                </div>

                <div style={{ marginBottom: "16px" }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: "0.82rem",
                            color: "var(--text-secondary)",
                            marginBottom: "6px",
                            fontWeight: 500,
                        }}
                    >
                        Backend URL
                    </label>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <input
                            type="text"
                            className="input-field"
                            value={backendUrl}
                            onChange={(e) => setBackendUrl(e.target.value)}
                            placeholder="http://localhost:8000"
                        />
                        <button
                            className="glow-btn"
                            onClick={checkHealth}
                            disabled={isChecking}
                            style={{ padding: "12px 20px", whiteSpace: "nowrap" }}
                        >
                            <RefreshCw size={15} />
                        </button>
                    </div>
                </div>

                {/* Connection Status */}
                <div
                    style={{
                        padding: "16px 20px",
                        borderRadius: "var(--radius-md)",
                        background: isConnected
                            ? "rgba(34, 197, 94, 0.06)"
                            : "rgba(239, 68, 68, 0.06)",
                        border: `1px solid ${isConnected
                                ? "rgba(34, 197, 94, 0.15)"
                                : "rgba(239, 68, 68, 0.15)"
                            }`,
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                    }}
                >
                    {isConnected ? (
                        <CheckCircle2 size={20} color="#22c55e" />
                    ) : (
                        <XCircle size={20} color="#ef4444" />
                    )}
                    <div>
                        <p
                            style={{
                                fontWeight: 600,
                                fontSize: "0.9rem",
                                color: isConnected ? "#22c55e" : "#ef4444",
                            }}
                        >
                            {isChecking
                                ? "Checking..."
                                : isConnected
                                    ? "Connected"
                                    : "Not Connected"}
                        </p>
                        {!isConnected && !isChecking && (
                            <p
                                style={{
                                    fontSize: "0.78rem",
                                    color: "var(--text-muted)",
                                    marginTop: "2px",
                                }}
                            >
                                Make sure the Python backend is running on the specified URL
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Model Info */}
            {health && (
                <div
                    className="glass-card"
                    style={{ padding: "28px", marginBottom: "20px" }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "20px",
                        }}
                    >
                        <Cpu size={16} color="var(--accent-purple)" />
                        <p className="section-label" style={{ margin: 0 }}>
                            Model Status
                        </p>
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "12px",
                        }}
                    >
                        <div
                            style={{
                                padding: "16px",
                                borderRadius: "var(--radius-md)",
                                background: "rgba(139, 92, 246, 0.04)",
                                border: "1px solid var(--border-subtle)",
                            }}
                        >
                            <p
                                style={{
                                    fontSize: "0.72rem",
                                    color: "var(--text-muted)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    marginBottom: "6px",
                                }}
                            >
                                Device
                            </p>
                            <p
                                style={{
                                    fontWeight: 600,
                                    fontSize: "1rem",
                                    color: "var(--text-primary)",
                                    textTransform: "uppercase",
                                }}
                            >
                                {health.device}
                            </p>
                        </div>
                        <div
                            style={{
                                padding: "16px",
                                borderRadius: "var(--radius-md)",
                                background: "rgba(139, 92, 246, 0.04)",
                                border: "1px solid var(--border-subtle)",
                            }}
                        >
                            <p
                                style={{
                                    fontSize: "0.72rem",
                                    color: "var(--text-muted)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    marginBottom: "6px",
                                }}
                            >
                                Model Status
                            </p>
                            <p
                                style={{
                                    fontWeight: 600,
                                    fontSize: "1rem",
                                    color: health.model_loaded ? "#22c55e" : "#f59e0b",
                                }}
                            >
                                {health.model_loaded ? "Loaded" : "Not Loaded"}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Start Guide */}
            <div className="glass-card" style={{ padding: "28px" }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "20px",
                    }}
                >
                    <HardDrive size={16} color="var(--accent-purple)" />
                    <p className="section-label" style={{ margin: 0 }}>
                        Quick Start
                    </p>
                </div>

                <div
                    style={{
                        fontSize: "0.88rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.8,
                    }}
                >
                    <p style={{ marginBottom: "12px" }}>
                        To start the backend server:
                    </p>
                    <div
                        style={{
                            background: "rgba(0, 0, 0, 0.3)",
                            borderRadius: "var(--radius-md)",
                            padding: "16px 20px",
                            fontFamily: "monospace",
                            fontSize: "0.82rem",
                            color: "var(--accent-cyan)",
                            lineHeight: 2,
                            overflowX: "auto",
                        }}
                    >
                        <div style={{ color: "var(--text-muted)" }}># 1. Navigate to backend</div>
                        <div>cd backend</div>
                        <br />
                        <div style={{ color: "var(--text-muted)" }}># 2. Install dependencies</div>
                        <div>pip install -r requirements.txt</div>
                        <br />
                        <div style={{ color: "var(--text-muted)" }}># 3. Start the server</div>
                        <div>uvicorn main:app --reload --port 8000</div>
                        <br />
                        <div style={{ color: "var(--text-muted)" }}># Optional: Set GPU device</div>
                        <div>set TTS_DEVICE=cuda</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
