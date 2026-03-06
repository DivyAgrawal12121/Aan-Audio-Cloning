"use client";

import React from "react";
import Link from "next/link";
import {
  Mic, Volume2, Sparkles, ArrowRight, Waves, Globe, Smile,
  Music, Languages, Podcast, Eraser,
} from "lucide-react";

const FEATURES = [
  {
    icon: Mic,
    title: "Voice Cloning",
    desc: "Clone any voice from a 3-second sample. Zero-shot, instant, reusable.",
    href: "/clone",
    accent: "var(--accent-purple)",
  },
  {
    icon: Volume2,
    title: "Generate Speech",
    desc: "Ultra-realistic TTS with emotion, pacing, and paralinguistic control.",
    href: "/generate",
    accent: "var(--accent-cyan)",
  },
  {
    icon: Sparkles,
    title: "Voice Design",
    desc: "Design entirely new voices from text descriptions — no samples needed.",
    href: "/design",
    accent: "var(--accent-pink)",
  },
  {
    icon: Music,
    title: "Sound Effects",
    desc: "Generate foley and ambient audio by describing any sound you can imagine.",
    href: "/foley",
    accent: "var(--accent-amber)",
  },
  {
    icon: Languages,
    title: "Voice Dubbing",
    desc: "Clone your voice and have it speak fluent French, Japanese, Hindi, and more.",
    href: "/dubbing",
    accent: "var(--accent-purple)",
  },
  {
    icon: Podcast,
    title: "Podcast Studio",
    desc: "Write a script and auto-generate a full two-speaker podcast episode.",
    href: "/podcast",
    accent: "var(--accent-pink)",
  },
  {
    icon: Eraser,
    title: "Audio Inpainting",
    desc: "Fix stumbles or coughs in recordings by regenerating just the bad segment.",
    href: "/inpaint",
    accent: "var(--accent-cyan)",
  },
  {
    icon: Waves,
    title: "Voice Library",
    desc: "Manage your collection of cloned and designed voices. Preview anytime.",
    href: "/voices",
    accent: "var(--accent-amber)",
  },
];

const STATS = [
  { label: "Languages", value: "11+", icon: Globe, bg: "var(--accent-cyan)" },
  { label: "Emotions", value: "10+", icon: Smile, bg: "var(--accent-pink)" },
  { label: "Cloning", value: "3 SEC", icon: Mic, bg: "var(--accent-purple)" },
  { label: "Engines", value: "8 RUN", icon: Waves, bg: "var(--accent-amber)" },
];

export default function DashboardPage() {
  return (
    <div className="page-container">
      {/* Hero */}
      <div style={{ marginBottom: "48px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--accent-amber)",
            border: "var(--border-thin)",
            padding: "6px 16px",
            boxShadow: "3px 3px 0px #000",
            marginBottom: "24px",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "#000", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            8 AI Engines Online • GPU Accelerated
          </span>
        </div>

        <h1
          style={{
            fontSize: "3.5rem",
            fontWeight: 900,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            marginBottom: "16px",
            color: "#000",
          }}
        >
          VOXFORGE <br />
          <span className="gradient-text">AI STUDIO</span>
        </h1>
        <p
          style={{
            fontSize: "1.1rem",
            color: "var(--text-secondary)",
            maxWidth: "600px",
            lineHeight: 1.5,
            fontWeight: 500,
          }}
        >
          Professional AI audio production powered by local models. Clone, design, and generate high-fidelity speech with full emotional control.
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "48px" }}>
        {STATS.map(({ label, value, icon: Icon, bg }) => (
          <div key={label} className="glass-card" style={{ padding: "20px", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <Icon size={20} color="black" strokeWidth={3} style={{ marginBottom: "8px" }} />
            <p style={{ fontSize: "1.75rem", fontWeight: 900, color: "#000" }}>{value}</p>
            <p style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000", marginTop: "2px" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Grid Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#000" }}>Creative Tools</h2>
      </div>

      {/* Feature Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px" }}>
        {FEATURES.map(({ icon: Icon, title, desc, href, accent }) => (
          <Link key={href} href={href} style={{ textDecoration: "none", color: "inherit" }}>
            <div
              className="glass-card"
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderBottom: `6px solid #000`,
              }}
            >
              <div style={{
                width: 48, height: 48,
                background: accent,
                border: "var(--border-thin)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: "20px",
                boxShadow: "3px 3px 0px #000"
              }}>
                <Icon size={22} color="black" strokeWidth={3} />
              </div>

              <h3 style={{ fontSize: "1.15rem", fontWeight: 900, color: "#000", marginBottom: "8px" }}>
                {title}
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, fontWeight: 500, flex: 1 }}>
                {desc}
              </p>

              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                marginTop: "24px", color: "#000",
                fontSize: "0.8rem", fontWeight: 900,
                textTransform: "uppercase", letterSpacing: "0.05em"
              }}>
                Launch Tool <ArrowRight size={16} strokeWidth={3} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer Branding */}
      <div style={{ marginTop: "60px", padding: "40px", borderTop: "var(--border-thick)", textAlign: "center" }}>
        <p style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.2em" }}>
          VoxForge AI Studio • Built for Creative Freedom
        </p>
      </div>
    </div>
  );
}
