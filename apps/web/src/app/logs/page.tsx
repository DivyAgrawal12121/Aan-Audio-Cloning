"use client";

import React, { useState, useEffect } from "react";
import { Terminal, RefreshCw, ShieldAlert } from "lucide-react";
import { getLogs } from "@resound-studio/api";

export default function LogsPage() {
    const [logs, setLogs] = useState<string>("INITIALIZING CONSOLE...");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchLogs = async () => {
        setIsRefreshing(true);
        try {
            const data = await getLogs();
            setLogs(data);
        } catch {
            setLogs("CONNECTION ERROR: CHECK BACKEND.");
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
            <div className="page-hero" style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ width: 56, height: 56, background: "var(--accent-purple)", border: "var(--border-thick)", boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Terminal size={26} color="black" strokeWidth={3} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>Server Logs</h1>
                        <p style={{ fontWeight: 600 }}>Real-time telemetry and system diagnostics.</p>
                    </div>
                </div>

                <button
                    onClick={fetchLogs}
                    disabled={isRefreshing}
                    style={{
                        padding: "12px 24px", background: "var(--accent-cyan)", border: "var(--border-thin)",
                        boxShadow: "3px 3px 0px #000", cursor: "pointer", display: "flex", gap: "10px",
                        alignItems: "center", fontWeight: 900, textTransform: "uppercase"
                    }}
                >
                    <RefreshCw size={18} className={isRefreshing ? "spin" : ""} strokeWidth={3} />
                    {isRefreshing ? "POLLING..." : "REFRESH"}
                </button>
            </div>

            {/* Log Console */}
            <div
                style={{
                    background: "#000",
                    border: "var(--border-thick)",
                    boxShadow: "6px 6px 0px #000",
                    padding: "24px",
                    position: "relative"
                }}
            >
                <div style={{ position: "absolute", top: "12px", right: "20px", display: "flex", gap: "6px" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
                </div>
                <pre
                    style={{
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        wordWrap: "break-word",
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        fontSize: "0.85rem",
                        color: "var(--accent-cyan)",
                        lineHeight: 1.6,
                        height: "55vh",
                        overflowY: "auto",
                        padding: "8px",
                        fontWeight: 600
                    }}
                >
                    {logs}
                </pre>
            </div>

            {/* Helpful tips */}
            <div className="section-card" style={{ marginTop: "24px", background: "var(--bg-secondary)", display: "flex", gap: "12px", alignItems: "center" }}>
                <ShieldAlert size={20} color="var(--accent-pink)" strokeWidth={3} />
                <p style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                    TIP: IF "DEMO MODE" IS ACTIVE, CHECK VRAM OR MODEL PATHS IN THE LOGS ABOVE.
                </p>
            </div>
        </div>
    );
}
