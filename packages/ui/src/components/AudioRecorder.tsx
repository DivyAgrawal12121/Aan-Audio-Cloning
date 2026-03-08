import React from "react";
import { Mic, Square, Trash2, AudioLines } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../utils";

interface AudioRecorderProps {
    isRecording: boolean;
    recordingTime: number;
    audioBlob: Blob | null;
    onStart: () => void;
    onStop: () => void;
    onReset: () => void;
    className?: string;
    onSave?: (blob: Blob) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
    isRecording,
    recordingTime,
    audioBlob,
    onStart,
    onStop,
    onReset,
    className,
    onSave,
}) => {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    if (audioBlob) {
        const url = URL.createObjectURL(audioBlob);
        return (
            <div className={cn("flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4", className)}>
                <audio src={url} controls className="h-10 w-full max-w-sm" />
                <div className="flex gap-2 ml-auto">
                    <Button variant="ghost" size="icon" onClick={onReset} title="Delete recording" className="text-slate-400 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    {onSave && (
                        <Button size="sm" onClick={() => onSave(audioBlob)}>
                            Use Audio
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6 md:p-8 text-center", className)}>
            <div className="relative flex items-center justify-center">
                {isRecording && (
                    <div className="absolute inset-0 rounded-full animate-ping bg-red-500/20" />
                )}
                <Button
                    variant={isRecording ? "ghost" : "primary"}
                    size="icon"
                    className={cn(
                        "relative z-10 h-16 w-16 rounded-full transition-all duration-300",
                        isRecording ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]" : ""
                    )}
                    onClick={isRecording ? onStop : onStart}
                >
                    {isRecording ? <Square className="h-6 w-6 fill-current" /> : <Mic className="h-6 w-6" />}
                </Button>
            </div>

            <div>
                <h4 className="font-medium text-slate-100 mb-1">
                    {isRecording ? "Recording in progress" : "Click to record"}
                </h4>
                <div className={cn("flex items-center justify-center gap-2 font-mono text-sm", isRecording ? "text-red-400" : "text-slate-500")}>
                    {isRecording && <span className="animate-pulse h-2 w-2 rounded-full bg-red-500" />}
                    {formatTime(recordingTime)}
                </div>
            </div>
        </div>
    );
};
