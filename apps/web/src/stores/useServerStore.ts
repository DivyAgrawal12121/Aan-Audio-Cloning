import { create } from "zustand";
import { checkHealth } from "@resound-studio/api";

interface ServerState {
    status: "online" | "offline" | "checking" | "error";
    activeModel: string | null;
    device: string | null;
    capabilities: string[];
    lastChecked: Date | null;
    startPolling: (intervalMs?: number) => void;
    stopPolling: () => void;
    setCapabilities: (caps: string[]) => void;
}

let pollInterval: NodeJS.Timeout | null = null;

export const useServerStore = create<ServerState>((set, get) => ({
    status: "checking",
    activeModel: null,
    device: null,
    capabilities: [],
    lastChecked: null,

    startPolling: (intervalMs = 10000) => {
        // Prevent multiple intervals
        if (pollInterval) return;

        const check = async () => {
            try {
                const data = await checkHealth();
                set({
                    status: data.status === "ok" ? "online" : "error",
                    activeModel: data.active_model,
                    device: data.device,
                    lastChecked: new Date(),
                });
            } catch (err) {
                set({
                    status: "offline",
                    activeModel: null,
                    device: null,
                    lastChecked: new Date(),
                });
            }
        };

        // Initial check
        check();

        // Poll
        pollInterval = setInterval(check, intervalMs);
    },

    stopPolling: () => {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    },

    setCapabilities: (caps) => set({ capabilities: caps }),
}));
