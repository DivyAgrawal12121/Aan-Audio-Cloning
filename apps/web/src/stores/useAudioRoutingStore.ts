import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AudioRoutingState {
    deviceMappings: Record<string, string>; // channel_id -> sinkId
    setDeviceMapping: (channelId: string, sinkId: string) => void;
    getSinkId: (channelId: string | null | undefined) => string | undefined;
}

export const useAudioRoutingStore = create<AudioRoutingState>()(
    persist(
        (set, get) => ({
            deviceMappings: {},
            setDeviceMapping: (channelId, sinkId) =>
                set((state) => ({
                    deviceMappings: { ...state.deviceMappings, [channelId]: sinkId }
                })),
            getSinkId: (channelId) => {
                if (!channelId) return undefined;
                return get().deviceMappings[channelId];
            }
        }),
        {
            name: 'resound-audio-routing',
        }
    )
);
