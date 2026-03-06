"use client";

import React, { useCallback, useRef, useState } from "react";
import { Upload, FileAudio, X, CheckCircle } from "lucide-react";

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
                setError(`Invalid format. Accepted: ${acceptedFormats}`);
                return false;
            }

            if (file.size > maxSizeMB * 1024 * 1024) {
                setError(`File too large. Max ${maxSizeMB}MB allowed.`);
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
                className="dropzone has-file"
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "20px 24px",
                }}
            >
                <div
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: "12px",
                        background: "rgba(6, 182, 212, 0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <CheckCircle size={24} color="#06b6d4" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                        style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            fontSize: "0.95rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {selectedFile.name}
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {formatSize(selectedFile.size)} •{" "}
                        {selectedFile.type || "audio file"}
                    </p>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                        setError(null);
                    }}
                    style={{
                        background: "rgba(239, 68, 68, 0.12)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        borderRadius: "8px",
                        padding: "8px",
                        cursor: "pointer",
                        color: "#ef4444",
                        transition: "all 0.2s ease",
                        flexShrink: 0,
                    }}
                    onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)")
                    }
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)")
                    }
                >
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <div>
            <div
                className={`dropzone ${isDragging ? "dragging" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                <div
                    style={{
                        width: 60,
                        height: 60,
                        borderRadius: "16px",
                        background: isDragging
                            ? "rgba(139, 92, 246, 0.15)"
                            : "rgba(139, 92, 246, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px",
                        transition: "all 0.3s ease",
                    }}
                >
                    {isDragging ? (
                        <FileAudio size={28} color="#8b5cf6" />
                    ) : (
                        <Upload size={28} color="#8b5cf6" />
                    )}
                </div>
                <p
                    style={{
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        fontSize: "1rem",
                        marginBottom: "6px",
                    }}
                >
                    {isDragging ? "Drop your audio file here" : "Upload Audio Sample"}
                </p>
                <p
                    style={{
                        fontSize: "0.82rem",
                        color: "var(--text-muted)",
                        lineHeight: 1.5,
                    }}
                >
                    Drag & drop or click to browse • 3–10 seconds recommended
                    <br />
                    WAV, MP3, FLAC, OGG, M4A supported • Max {maxSizeMB}MB
                </p>
            </div>

            {error && (
                <p
                    style={{
                        color: "#ef4444",
                        fontSize: "0.82rem",
                        marginTop: "8px",
                        padding: "8px 12px",
                        background: "rgba(239, 68, 68, 0.08)",
                        borderRadius: "8px",
                        border: "1px solid rgba(239, 68, 68, 0.15)",
                    }}
                >
                    {error}
                </p>
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
