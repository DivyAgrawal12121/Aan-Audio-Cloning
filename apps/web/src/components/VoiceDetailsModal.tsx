"use client";

import React, { useState } from "react";
import { Modal, Button, AudioRecorder, AudioUploader, AudioPlayer } from "@resound-studio/ui";
import { useVoiceSamples, useAddVoiceSample, useDeleteVoiceSample } from "@/hooks/api/useVoices";
import { SavedVoice } from "@resound-studio/shared";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { Plus, Trash2, Mic, Upload, Download } from "lucide-react";

interface VoiceDetailsModalProps {
    voice: SavedVoice | null;
    onClose: () => void;
}

export default function VoiceDetailsModal({ voice, onClose }: VoiceDetailsModalProps) {
    const { data: samples, isLoading: isLoadingSamples } = useVoiceSamples(voice?.id || "");
    const addSample = useAddVoiceSample();
    const deleteSample = useDeleteVoiceSample();

    const [activeTab, setActiveTab] = useState<"samples" | "add">("samples");
    const [addMode, setAddMode] = useState<"record" | "upload" | null>(null);

    const recorder = useAudioRecorder();

    if (!voice) return null;

    const handleSaveRecording = async (blob: Blob) => {
        const file = new File([blob], `sample_${Date.now()}.wav`, { type: "audio/wav" });
        await addSample.mutateAsync({ voiceId: voice.id, file });
        recorder.resetRecording();
        setActiveTab("samples");
        setAddMode(null);
    };

    const handleFileUpload = async (file: File) => {
        await addSample.mutateAsync({ voiceId: voice.id, file });
        setActiveTab("samples");
        setAddMode(null);
    };

    return (
        <Modal
            isOpen={!!voice}
            onClose={onClose}
            title={`Voice Profile: ${voice.name}`}
            description={voice.description || "No description provided."}
            className="max-w-3xl"
        >
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-2">
                <div className="flex gap-4">
                    <button
                        className={`px-4 py-2 font-semibold transition-colors ${activeTab === "samples" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400 hover:text-slate-200"}`}
                        onClick={() => setActiveTab("samples")}
                    >
                        Manage Samples
                    </button>
                    <button
                        className={`px-4 py-2 font-semibold transition-colors ${activeTab === "add" ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400 hover:text-slate-200"}`}
                        onClick={() => setActiveTab("add")}
                    >
                        Add New Sample
                    </button>
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/voices/${voice.id}/export`, "_blank")}
                >
                    <Download className="w-4 h-4 mr-2" />
                    Export (.resound)
                </Button>
            </div>

            {activeTab === "samples" && (
                <div className="space-y-4">
                    {isLoadingSamples ? (
                        <div className="text-center py-8 text-slate-400 animate-pulse">Loading samples...</div>
                    ) : samples?.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">No extra samples found. Add more to improve quality!</div>
                    ) : (
                        <ul className="space-y-3">
                            {samples?.map((col) => (
                                <li key={col.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900/50">
                                    <div className="flex-1 mr-4">
                                        <AudioPlayer audioUrl={col.audio_url} label={`Sample ${col.id.substring(0, 8)}`} showDownload={false} channelId={voice.channel_id} />
                                    </div>
                                    <Button
                                        variant="danger"
                                        size="icon"
                                        onClick={() => {
                                            if (confirm("Delete this audio sample?")) {
                                                deleteSample.mutate({ voiceId: voice.id, sampleId: col.id });
                                            }
                                        }}
                                        disabled={deleteSample.isPending}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {activeTab === "add" && (
                <div className="space-y-6">
                    {!addMode ? (
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setAddMode("record")}
                                className="flex flex-col items-center justify-center p-8 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 transition-colors"
                            >
                                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
                                    <Mic className="h-6 w-6" />
                                </div>
                                <h3 className="font-semibold text-lg mb-1">Record In-App</h3>
                                <p className="text-sm text-slate-400 text-center">Use your microphone</p>
                            </button>

                            <button
                                onClick={() => setAddMode("upload")}
                                className="flex flex-col items-center justify-center p-8 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 transition-colors"
                            >
                                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
                                    <Upload className="h-6 w-6" />
                                </div>
                                <h3 className="font-semibold text-lg mb-1">Upload File</h3>
                                <p className="text-sm text-slate-400 text-center">Select WAV or MP3</p>
                            </button>
                        </div>
                    ) : addMode === "record" ? (
                        <div className="space-y-4">
                            <Button variant="ghost" size="sm" onClick={() => setAddMode(null)} className="mb-2">
                                ← Back
                            </Button>
                            <AudioRecorder
                                isRecording={recorder.isRecording}
                                recordingTime={recorder.recordingTime}
                                audioBlob={recorder.audioBlob}
                                onStart={recorder.startRecording}
                                onStop={recorder.stopRecording}
                                onReset={recorder.resetRecording}
                                onSave={handleSaveRecording}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Button variant="ghost" size="sm" onClick={() => setAddMode(null)} className="mb-2">
                                ← Back
                            </Button>
                            <AudioUploader
                                selectedFile={null}
                                onFileSelect={handleFileUpload}
                                onClear={() => { }}
                            />
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
