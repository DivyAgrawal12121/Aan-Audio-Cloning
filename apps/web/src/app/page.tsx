"use client";

import React from "react";
import Link from "next/link";
import {
  Mic, Volume2, Sparkles, Library, ArrowRight, Waves, Globe, Smile,
  Music, Languages, Podcast, Eraser,
} from "lucide-react";

const FEATURES = [
  {
    icon: Mic,
    title: "Voice Cloning",
    desc: "Clone any voice from a 3-second sample. Zero-shot, instant, reusable.",
    href: "/clone",
    gradient: "linear-gradient(135deg, #8b5cf6, #6366f1)",
    glow: "rgba(139, 92, 246, 0.15)",
  },
  {
    icon: Volume2,
    title: "Generate Speech",
    desc: "Ultra-realistic TTS with emotion, pacing, and paralinguistic control.",
    href: "/generate",
    gradient: "linear-gradient(135deg, #06b6d4, #3b82f6)",
    glow: "rgba(6, 182, 212, 0.15)",
  },
  {
    icon: Sparkles,
    title: "Voice Design",
    desc: "Design entirely new voices from text descriptions — no samples needed.",
    href: "/design",
    gradient: "linear-gradient(135deg, #ec4899, #f43f5e)",
    glow: "rgba(236, 72, 153, 0.15)",
  },
  {
    icon: Music,
    title: "Sound Effects",
    desc: "Generate foley and ambient audio by describing any sound you can imagine.",
    href: "/foley",
    gradient: "linear-gradient(135deg, #10b981, #06b6d4)",
    glow: "rgba(16, 185, 129, 0.15)",
  },
  {
    icon: Languages,
    title: "Voice Dubbing",
    desc: "Clone your voice and have it speak fluent French, Japanese, Hindi, and more.",
    href: "/dubbing",
    gradient: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    glow: "rgba(59, 130, 246, 0.15)",
  },
  {
    icon: Podcast,
    title: "Podcast Studio",
    desc: "Write a script and auto-generate a full two-speaker podcast episode.",
    href: "/podcast",
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    glow: "rgba(245, 158, 11, 0.15)",
  },
  {
    icon: Eraser,
    title: "Audio Inpainting",
    desc: "Fix stumbles or coughs in recordings by regenerating just the bad segment.",
    href: "/inpaint",
    gradient: "linear-gradient(135deg, #ec4899, #8b5cf6)",
    glow: "rgba(236, 72, 153, 0.15)",
  },
  {
    icon: Library,
    title: "Voice Library",
    desc: "Manage your collection of cloned and designed voices. Preview anytime.",
    href: "/voices",
    gradient: "linear-gradient(135deg, #64748b, #334155)",
    glow: "rgba(100, 116, 139, 0.15)",
  },
];

const STATS = [
  { label: "Supported Languages", value: "11+", icon: Globe },
  { label: "Emotion Styles", value: "10+", icon: Smile },
  { label: "Voice Cloning", value: "3s", icon: Mic },
  { label: "AI Models", value: "8", icon: Waves },
];

export default function DashboardPage() {
  return (
    <div className="page-container">
      {/* Hero */}
      <div style={{ marginBottom: "40px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(139, 92, 246, 0.08)",
            border: "1px solid rgba(139, 92, 246, 0.15)",
            borderRadius: "20px",
            padding: "6px 16px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 6px rgba(34, 197, 94, 0.6)",
            }}
          />
          <span style={{ fontSize: "0.75rem", color: "var(--accent-purple)", fontWeight: 500 }}>
            Multi-Model Architecture • 8 AI Engines Available
          </span>
        </div>

        <h1
          style={{
            fontSize: "2.8rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            marginBottom: "14px",
          }}
        >
          Your AI{" "}
          <span className="gradient-text">Voice Studio</span>
        </h1>
        <p
          style={{
            fontSize: "1.05rem",
            color: "var(--text-secondary)",
            maxWidth: "600px",
            lineHeight: 1.6,
          }}
        >
          Clone voices, design new ones from text, dub across languages,
          generate podcasts, create sound effects — all powered by local AI models on your GPU.
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "14px", marginBottom: "36px" }}>
        {STATS.map(({ label, value, icon: Icon }) => (
          <div key={label} className="glass-card" style={{ padding: "18px", textAlign: "center" }}>
            <Icon size={18} style={{ color: "var(--accent-purple)", marginBottom: "6px" }} />
            <p style={{
              fontSize: "1.5rem", fontWeight: 700,
              background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {value}
            </p>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Feature Cards in 2-column grid  */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
        {FEATURES.map(({ icon: Icon, title, desc, href, gradient, glow }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div
              className="glass-card"
              style={{
                padding: "24px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Glow */}
              <div style={{
                position: "absolute", top: "-30px", right: "-30px",
                width: "130px", height: "130px",
                background: glow, borderRadius: "50%", filter: "blur(50px)", pointerEvents: "none",
              }} />

              <div style={{
                width: 44, height: 44, borderRadius: "12px",
                background: gradient,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: "16px",
                boxShadow: `0 6px 20px ${glow}`,
              }}>
                <Icon size={20} color="white" />
              </div>

              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
                {title}
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.55, flex: 1 }}>
                {desc}
              </p>

              <div style={{
                display: "flex", alignItems: "center", gap: "6px",
                marginTop: "16px", color: "var(--accent-purple)",
                fontSize: "0.8rem", fontWeight: 600,
              }}>
                Open <ArrowRight size={14} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Languages */}
      <div className="glass-card" style={{ padding: "24px", marginTop: "20px" }}>
        <p className="section-label">Supported Languages</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
          {[
            "English", "Hindi", "Chinese", "Japanese", "Korean",
            "German", "French", "Russian", "Portuguese", "Spanish", "Italian",
          ].map((lang) => (
            <span key={lang} className="tag">{lang}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
