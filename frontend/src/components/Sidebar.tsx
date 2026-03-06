"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Mic, Volume2, Library, Sparkles, Home, Settings, Waves,
    Music, Languages, Podcast, Eraser,
} from "lucide-react";
import ModelSelector from "./ModelSelector";

const NAV_ITEMS = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/clone", label: "Voice Cloning", icon: Mic },
    { href: "/generate", label: "Generate Speech", icon: Volume2 },
    { href: "/design", label: "Voice Design", icon: Sparkles },
    { href: "/foley", label: "Sound Effects", icon: Music },
    { href: "/dubbing", label: "Voice Dubbing", icon: Languages },
    { href: "/podcast", label: "Podcast Studio", icon: Podcast },
    { href: "/inpaint", label: "Audio Inpainting", icon: Eraser },
    { href: "/voices", label: "My Voices", icon: Library },
    { href: "/logs", label: "Server Logs", icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "var(--sidebar-width)",
                height: "100vh",
                background: "rgba(8, 8, 18, 0.92)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderRight: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                padding: "20px 0",
                zIndex: 50,
                overflowY: "auto",
            }}
        >
            {/* Logo */}
            <Link
                href="/"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "0 20px",
                    marginBottom: "20px",
                    textDecoration: "none",
                }}
            >
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 16px rgba(139, 92, 246, 0.35)",
                    }}
                >
                    <Waves size={18} color="white" />
                </div>
                <div>
                    <h1
                        style={{
                            fontSize: "1.15rem",
                            fontWeight: 800,
                            letterSpacing: "-0.02em",
                            background: "linear-gradient(135deg, #f1f5f9, #94a3b8)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        VoxForge
                    </h1>
                    <p
                        style={{
                            fontSize: "0.58rem",
                            color: "var(--text-muted)",
                            fontWeight: 500,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                        }}
                    >
                        AI Voice Studio
                    </p>
                </div>
            </Link>

            {/* AI Model Selector */}
            <ModelSelector />

            <div style={{ height: "16px" }} />

            {/* Navigation */}
            <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", padding: "0 10px" }}>
                <p
                    style={{
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: "var(--text-muted)",
                        padding: "0 10px",
                        marginBottom: "6px",
                    }}
                >
                    Workspace
                </p>
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "9px 12px",
                                borderRadius: "8px",
                                textDecoration: "none",
                                fontSize: "0.82rem",
                                fontWeight: isActive ? 600 : 450,
                                color: isActive ? "white" : "var(--text-secondary)",
                                background: isActive
                                    ? "linear-gradient(135deg, rgba(139, 92, 246, 0.16), rgba(99, 102, 241, 0.08))"
                                    : "transparent",
                                border: isActive
                                    ? "1px solid rgba(139, 92, 246, 0.2)"
                                    : "1px solid transparent",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = "rgba(139, 92, 246, 0.05)";
                                    e.currentTarget.style.color = "var(--text-primary)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.color = "var(--text-secondary)";
                                }
                            }}
                        >
                            <Icon
                                size={16}
                                style={{
                                    color: isActive ? "var(--accent-purple)" : "var(--text-muted)",
                                }}
                            />
                            {label}
                            {isActive && (
                                <div
                                    style={{
                                        marginLeft: "auto",
                                        width: 5,
                                        height: 5,
                                        borderRadius: "50%",
                                        background: "var(--accent-purple)",
                                        boxShadow: "0 0 6px var(--accent-purple)",
                                    }}
                                />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div
                style={{
                    padding: "14px 20px",
                    borderTop: "1px solid var(--border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                }}
            >
                <div
                    style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#22c55e",
                        boxShadow: "0 0 6px rgba(34, 197, 94, 0.6)",
                    }}
                />
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    GPU Backend Ready
                </span>
            </div>
        </aside>
    );
}
