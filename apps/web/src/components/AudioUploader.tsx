"use client";

import React, { useCallback, useRef, useState } from "react";
import { Upload, FileAudio, X, CheckCircle, Info } from "lucide-react";

interface AudioUploaderProps {
    onFileSelect: (file: File) => void;
    acceptedFormats?: string;
    maxSizeMB?: number;
    selectedFile: File | null;
    onClear: () => void;
}

export default function AudioUploader({
    onFileSelect,
    acceptedFormats = ".wav,.mp3,.flac,.ogg,.m4a,.webm",
    maxSizeMB = 50,
    selectedFile,
    onClear,
}: AudioUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateFile = useCallback(
        (file: File): boolean => {
            setError(null);

            const allowedExts = acceptedFormats
                .split(",")
                .map((e) => e.trim().toLowerCase());
            const ext = "." + file.name.split(".").pop()?.toLowerCase();
            if (!allowedExts.includes(ext)) {
                setError(`INVALID FORMAT: ${acceptedFormats.toUpperCase()}`);
                return false;
            }

            if (file.size > maxSizeMB * 1024 * 1024) {
                setError(`FILE TOO LARGE: MAX ${maxSizeMB}MB`);
                return false;
            }

            return true;
        },
        [acceptedFormats, maxSizeMB]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file && validateFile(file)) {
                onFileSelect(file);
            }
        },
        [onFileSelect, validateFile]
    );

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file && validateFile(file)) {
                onFileSelect(file);
            }
        },
        [onFileSelect, validateFile]
    );

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    if (selectedFile) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "20px 24px",
                    background: "var(--accent-cyan)",
                    border: "var(--border-thin)",
                    boxShadow: "4px 4px 0px #000",
                }}
            >
                <div
                    style={{
                        width: 44,
                        height: 44,
                        background: "#000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <CheckCircle size={22} color="var(--accent-cyan)" strokeWidth={3} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                        style={{
                            fontWeight: 900,
                            color: "#000",
                            fontSize: "0.95rem",
                            textTransform: "uppercase",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {selectedFile.name}
                    </p>
                    <p style={{ fontSize: "0.7rem", fontWeight: 800, color: "rgba(0,0,0,0.6)", marginTop: "2px", textTransform: "uppercase" }}>
                        {formatSize(selectedFile.size)} • READY
                    </p>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                        setError(null);
                    }}
                    style={{
                        background: "#fff",
                        border: "2px solid #000",
                        padding: "8px",
                        cursor: "pointer",
                        color: "#000",
                        boxShadow: "2px 2px 0px #000",
                        flexShrink: 0,
                    }}
                >
                    <X size={16} strokeWidth={3} />
                </button>
            </div>
        );
    }

    return (
        <div>
            <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                style={{
                    border: "3px dashed #000",
                    background: isDragging ? "var(--bg-secondary)" : "#fff",
                    padding: "40px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    boxShadow: isDragging ? "inset 4px 4px 0px rgba(0,0,0,0.1)" : "none",
                    transition: "all 0.1s ease",
                }}
            >
                <div
                    style={{
                        width: 64,
                        height: 64,
                        background: "var(--accent-purple)",
                        border: "2px solid #000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 20px",
                        boxShadow: "4px 4px 0px #000",
                    }}
                >
                    {isDragging ? (
                        <FileAudio size={30} color="black" strokeWidth={3} />
                    ) : (
                        <Upload size={30} color="black" strokeWidth={3} />
                    )}
                </div>
                <p style={{ fontWeight: 900, fontSize: "1.15rem", textTransform: "uppercase", color: "#000", marginBottom: "8px" }}>
                    {isDragging ? "DROP IT HERE!" : "UPLOAD AUDIO"}
                </p>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    DRAG & DROP OR CLICK • WAV, MP3, FLAC • MAX {maxSizeMB}MB
                </p>
            </div>

            {error && (
                <div style={{ marginTop: "12px", background: "#fee2e2", border: "2px solid #ef4444", padding: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
                    <Info size={16} color="#ef4444" strokeWidth={3} />
                    <p style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: 800 }}>{error}</p>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept={acceptedFormats}
                onChange={handleChange}
                style={{ display: "none" }}
            />
        </div>
    );
}
