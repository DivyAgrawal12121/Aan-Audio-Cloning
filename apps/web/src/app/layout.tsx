import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import QueryProvider from "@/lib/query-provider";

export const metadata: Metadata = {
  title: "Resound Studio — AI Voice Studio",
  description:
    "Clone voices, design custom voices, and generate ultra-realistic speech with Qwen3-TTS. Supports 11 languages, emotion control, and paralinguistic features.",
  keywords: [
    "TTS",
    "text to speech",
    "voice cloning",
    "AI voice",
    "Qwen3-TTS",
    "voice design",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <QueryProvider>
          {/* Ambient background orbs */}
          <div className="ambient-orb ambient-orb-1" />
          <div className="ambient-orb ambient-orb-2" />
          <div className="ambient-orb ambient-orb-3" />

          <div
            style={{
              display: "flex",
              minHeight: "100vh",
              position: "relative",
              zIndex: 1,
            }}
          >
            <Sidebar />
            <main
              style={{
                flex: 1,
                marginLeft: "var(--sidebar-width)",
                padding: "32px 40px 60px",
                maxWidth: "calc(100vw - var(--sidebar-width))",
                overflowY: "auto",
                transition: "margin-left 0.3s ease",
              }}
            >
              {children}
            </main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
