"use client";

import React from "react";
import Link from "next/link";
import { Mic, Volume2, Sparkles, Library, ArrowRight, Waves, Globe, Smile } from "lucide-react";

const FEATURES = [
  {
    icon: Mic,
    title: "Voice Cloning",
    desc: "Clone any voice from a 3-second audio sample. Save and reuse for unlimited generations.",
    href: "/clone",
    gradient: "linear-gradient(135deg, #8b5cf6, #6366f1)",
    glow: "rgba(139, 92, 246, 0.15)",
  },
  {
    icon: Volume2,
    title: "Text to Speech",
    desc: "Generate ultra-realistic speech with emotion, pacing, and paralinguistic control.",
    href: "/generate",
    gradient: "linear-gradient(135deg, #06b6d4, #3b82f6)",
    glow: "rgba(6, 182, 212, 0.15)",
  },
  {
    icon: Sparkles,
    title: "Voice Design",
    desc: "Design entirely new voices using natural language descriptions — no samples needed.",
    href: "/design",
    gradient: "linear-gradient(135deg, #ec4899, #f43f5e)",
    glow: "rgba(236, 72, 153, 0.15)",
  },
  {
    icon: Library,
    title: "Voice Library",
    desc: "Manage your collection of cloned and designed voices. Preview anytime.",
    href: "/voices",
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    glow: "rgba(245, 158, 11, 0.15)",
  },
];

const STATS = [
  { label: "Supported Languages", value: "11", icon: Globe },
  { label: "Emotion Styles", value: "10+", icon: Smile },
  { label: "Voice Cloning", value: "3s", icon: Mic },
  { label: "Latency", value: "<100ms", icon: Waves },
];

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: "1100px" }}>
      {/* Hero */}
      <div style={{ marginBottom: "48px" }}>
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
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 6px rgba(34, 197, 94, 0.6)",
            }}
          />
          <span style={{ fontSize: "0.78rem", color: "var(--accent-purple)", fontWeight: 500 }}>
            Powered by Qwen3-TTS 1.7B INT8
          </span>
        </div>

        <h1
          style={{
            fontSize: "3rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            marginBottom: "16px",
          }}
        >
          Your AI{" "}
          <span className="gradient-text">Voice Studio</span>
        </h1>
        <p
          style={{
            fontSize: "1.1rem",
            color: "var(--text-secondary)",
            maxWidth: "600px",
            lineHeight: 1.6,
          }}
        >
          Clone voices, design new ones from text, and generate ultra-realistic
          speech in 11 languages with full emotional control.
        </p>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "40px",
        }}
      >
        {STATS.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="glass-card"
            style={{
              padding: "20px",
              textAlign: "center",
            }}
          >
            <Icon
              size={20}
              style={{ color: "var(--accent-purple)", marginBottom: "8px" }}
            />
            <p
              style={{
                fontSize: "1.6rem",
                fontWeight: 700,
                background: "var(--gradient-primary)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {value}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Feature Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "20px",
        }}
      >
        {FEATURES.map(({ icon: Icon, title, desc, href, gradient, glow }) => (
          <Link
            key={href}
            href={href}
            style={{ textDecoration: "none" }}
          >
            <div
              className="glass-card"
              style={{
                padding: "28px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Glow */}
              <div
                style={{
                  position: "absolute",
                  top: "-40px",
                  right: "-40px",
                  width: "160px",
                  height: "160px",
                  background: glow,
                  borderRadius: "50%",
                  filter: "blur(60px)",
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "14px",
                  background: gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px",
                  boxShadow: `0 8px 24px ${glow}`,
                }}
              >
                <Icon size={24} color="white" />
              </div>

              <h3
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontSize: "0.88rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  flex: 1,
                }}
              >
                {desc}
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "20px",
                  color: "var(--accent-purple)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                Get Started <ArrowRight size={15} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Languages */}
      <div className="glass-card" style={{ padding: "28px", marginTop: "24px" }}>
        <p className="section-label">Supported Languages</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
          {[
            "English", "Hindi", "Chinese", "Japanese", "Korean",
            "German", "French", "Russian", "Portuguese", "Spanish", "Italian",
          ].map((lang) => (
            <span key={lang} className="tag">
              {lang}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
