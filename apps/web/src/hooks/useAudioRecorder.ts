import { useState, useRef, useCallback } from "react";

export function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(chunksRef.current, { type: "audio/wav" });
                setAudioBlob(audioBlob);
                chunksRef.current = [];
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setIsPaused(false);

            timerIntervalRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Failed to access microphone:", err);
            alert("Microphone access denied or unavailable.");
        }
    }, []);

    const pauseRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
    }, []);

    const resumeRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === "paused") {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            timerIntervalRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
    }, []);

    const resetRecording = useCallback(() => {
        setAudioBlob(null);
        setRecordingTime(0);
        chunksRef.current = [];
    }, []);

    return {
        isRecording,
        isPaused,
        recordingTime,
        audioBlob,
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        resetRecording,
    };
}
