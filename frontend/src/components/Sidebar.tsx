"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Mic,
    Volume2,
    Library,
    Sparkles,
    Home,
    Settings,
    Waves,
} from "lucide-react";

const NAV_ITEMS = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/clone", label: "Voice Cloning", icon: Mic },
    { href: "/generate", label: "Generate Speech", icon: Volume2 },
    { href: "/design", label: "Voice Design", icon: Sparkles },
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
                background: "rgba(10, 10, 20, 0.85)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderRight: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                padding: "28px 0",
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
                    gap: "12px",
                    padding: "0 24px",
                    marginBottom: "40px",
                    textDecoration: "none",
                }}
            >
                <div
                    style={{
                        width: 42,
                        height: 42,
                        borderRadius: "14px",
                        background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 20px rgba(139, 92, 246, 0.4)",
                    }}
                >
                    <Waves size={22} color="white" />
                </div>
                <div>
                    <h1
                        style={{
                            fontSize: "1.3rem",
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
                            fontSize: "0.65rem",
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

            {/* Navigation */}
            <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px", padding: "0 12px" }}>
                <p
                    style={{
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: "var(--text-muted)",
                        padding: "0 12px",
                        marginBottom: "8px",
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
                                gap: "12px",
                                padding: "11px 16px",
                                borderRadius: "10px",
                                textDecoration: "none",
                                fontSize: "0.9rem",
                                fontWeight: isActive ? 600 : 450,
                                color: isActive ? "white" : "var(--text-secondary)",
                                background: isActive
                                    ? "linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(99, 102, 241, 0.1))"
                                    : "transparent",
                                border: isActive
                                    ? "1px solid rgba(139, 92, 246, 0.25)"
                                    : "1px solid transparent",
                                transition: "all 0.25s ease",
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = "rgba(139, 92, 246, 0.06)";
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
                                size={18}
                                style={{
                                    color: isActive ? "var(--accent-purple)" : "var(--text-muted)",
                                }}
                            />
                            {label}
                            {isActive && (
                                <div
                                    style={{
                                        marginLeft: "auto",
                                        width: 6,
                                        height: 6,
                                        borderRadius: "50%",
                                        background: "var(--accent-purple)",
                                        boxShadow: "0 0 8px var(--accent-purple)",
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
                    padding: "20px 24px",
                    borderTop: "1px solid var(--border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                }}
            >
                <div
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#22c55e",
                        boxShadow: "0 0 8px rgba(34, 197, 94, 0.6)",
                    }}
                />
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Qwen3-TTS Ready
                </span>
                <Link
                    href="/settings"
                    style={{
                        marginLeft: "auto",
                        color: "var(--text-muted)",
                        transition: "color 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                    <Settings size={16} />
                </Link>
            </div>
        </aside>
    );
}
