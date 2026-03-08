import { create } from "zustand";

interface AppState {
    activeVoiceId: string | null;
    setActiveVoiceId: (id: string | null) => void;
    isSidebarOpen: boolean;
    setSidebarOpen: (isOpen: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
    activeVoiceId: null,
    setActiveVoiceId: (id) => set({ activeVoiceId: id }),
    isSidebarOpen: true,
    setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
}));
