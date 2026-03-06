"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook that simulates progress for async operations.
 * Gradually increases progress to 95%, then jumps to 100% when `complete()` is called.
 *
 * Usage:
 * ```tsx
 * const { progress, isActive, start, complete } = useSimulatedProgress();
 *
 * const handleAction = async () => {
 *   start();
 *   try {
 *     await someAsyncWork();
 *   } finally {
 *     complete();
 *   }
 * };
 * ```
 */
export function useSimulatedProgress(
    incrementSpeed: number = 800,
    maxIncrement: number = 5
) {
    const [progress, setProgress] = useState(0);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        if (isActive && progress < 95) {
            const timer = setInterval(() => {
                setProgress((prev) => Math.min(prev + Math.random() * maxIncrement, 95));
            }, incrementSpeed);
            return () => clearInterval(timer);
        }
    }, [isActive, progress, incrementSpeed, maxIncrement]);

    const start = useCallback(() => {
        setProgress(0);
        setIsActive(true);
    }, []);

    const complete = useCallback(() => {
        setProgress(100);
        setTimeout(() => {
            setIsActive(false);
            setProgress(0);
        }, 500);
    }, []);

    return { progress, isActive, start, complete };
}
