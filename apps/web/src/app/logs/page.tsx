"use client";

import React, { useState, useEffect } from "react";
import { Terminal, RefreshCw, Trash2, ShieldAlert } from "lucide-react";

export default function LogsPage() {
    const [logs, setLogs] = useState<string>("Loading logs...");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    const fetchLogs = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetch(`${backendUrl}/api/logs`);
            const data = await res.json();
            setLogs(data.logs || "No logs available.");
        } catch (err) {
            setLogs(`Error connecting to backend at ${backendUrl}\nMake sure the server is running.`);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    return (
        <div className="page-container-lg">
            {/* Header */}
            <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: "14px",
                            background: "linear-gradient(135deg, #1e293b, #0f172a)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid var(--border-subtle)",
                        }}
                    >
                        <Terminal size={22} color="var(--accent-purple)" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Backend Logs</h1>
                        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                            Real-time server outputs and error traces
                        </p>
                    </div>
                </div>

                <button
                    className="glow-btn"
                    onClick={fetchLogs}
                    disabled={isRefreshing}
                    style={{ padding: "10px 16px", display: "flex", gap: "8px", alignItems: "center" }}
                >
                    <RefreshCw size={14} className={isRefreshing ? "spin-animation" : ""} />
                    Refresh
                </button>
            </div>

            {/* Log Console */}
            <div
                className="glass-card no-hover-lift"
                style={{
                    padding: "16px",
                    background: "#020617",
                    border: "1px solid #1e293b",
                    boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)"
                }}
            >
                <pre
                    style={{
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        wordWrap: "break-word",
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: "0.82rem",
                        color: "#6ee7b7", /* Green console text */
                        lineHeight: 1.6,
                        height: "60vh",
                        overflowY: "auto",
                        padding: "8px"
                    }}
                >
                    {logs}
                </pre>
            </div>

            {/* Helpful tips */}
            <div style={{ display: "flex", gap: "12px", marginTop: "16px", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                <ShieldAlert size={14} style={{ color: "var(--accent-pink)", marginTop: "2px" }} />
                <p>If you see "Falling back to demo mode", the Qwen3-TTS model failed to load. Check the VRAM or connection errors above.</p>
            </div>
        </div>
    );
}
