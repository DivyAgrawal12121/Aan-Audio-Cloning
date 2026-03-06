"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Mic, Volume2, Library, Sparkles, Home, Settings, Waves,
    Music, Languages, Podcast, Eraser, HardDrive
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
    { href: "/models", label: "Model Manager", icon: HardDrive },
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
                background: "var(--bg-secondary)",
                borderRight: "var(--border-thick)",
                display: "flex",
                flexDirection: "column",
                padding: "24px 0",
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
                    marginBottom: "32px",
                    textDecoration: "none",
                }}
            >
                <div
                    style={{
                        width: 42,
                        height: 42,
                        borderRadius: "8px",
                        background: "var(--accent-purple)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "var(--border-thin)",
                        boxShadow: "3px 3px 0px #000",
                    }}
                >
                    <Waves size={22} color="black" strokeWidth={3} />
                </div>
                <div>
                    <h1
                        style={{
                            fontSize: "1.25rem",
                            fontWeight: 900,
                            letterSpacing: "0.05em",
                            color: "#000",
                            textTransform: "uppercase",
                            lineHeight: 1,
                        }}
                    >
                        VoxForge
                    </h1>
                    <p
                        style={{
                            fontSize: "0.6rem",
                            color: "var(--text-muted)",
                            fontWeight: 800,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            marginTop: "2px",
                        }}
                    >
                        AI Voice Studio
                    </p>
                </div>
            </Link>

            {/* AI Model Selector */}
            <div style={{ padding: "0 16px" }}>
                <ModelSelector />
            </div>

            <div style={{ height: "24px" }} />

            {/* Navigation */}
            <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", padding: "0 16px" }}>
                <p
                    style={{
                        fontSize: "0.65rem",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                        color: "var(--text-muted)",
                        padding: "0 12px",
                        marginBottom: "4px",
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
                                padding: "12px 16px",
                                borderRadius: "4px",
                                textDecoration: "none",
                                fontSize: "0.85rem",
                                fontWeight: 800,
                                color: "#000",
                                background: isActive ? "var(--accent-pink)" : "transparent",
                                border: isActive ? "var(--border-thin)" : "2px solid transparent",
                                boxShadow: isActive ? "3px 3px 0px #000" : "none",
                                transition: "all 0.1s ease",
                                transform: isActive ? "translate(-2px, -2px)" : "none",
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = "white";
                                    e.currentTarget.style.border = "var(--border-thin)";
                                    e.currentTarget.style.boxShadow = "3px 3px 0px #000";
                                    e.currentTarget.style.transform = "translate(-2px, -2px)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.border = "2px solid transparent";
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.transform = "none";
                                }
                            }}
                        >
                            <Icon
                                size={18}
                                strokeWidth={isActive ? 3 : 2}
                                color="black"
                            />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div
                style={{
                    padding: "20px 24px",
                    borderTop: "var(--border-thin)",
                    marginTop: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "white",
                }}
            >
                <div
                    style={{
                        width: 10,
                        height: 10,
                        background: "var(--accent-green)",
                        border: "1px solid #000",
                    }}
                />
                <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    GPU System Online
                </span>
            </div>
        </aside>
    );
}
