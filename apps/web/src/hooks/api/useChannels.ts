import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getChannels, createChannel, updateChannel, deleteChannel } from "@resound-studio/api";
import type { AudioChannel } from "@resound-studio/shared";

export const channelsKeys = {
    all: ["channels"] as const,
    lists: () => [...channelsKeys.all, "list"] as const,
};

export function useChannels() {
    return useQuery({
        queryKey: channelsKeys.lists(),
        queryFn: getChannels,
    });
}

export function useCreateChannel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; color?: string }) => createChannel(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: channelsKeys.lists() });
        },
    });
}

export function useUpdateChannel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: { name?: string; color?: string } }) =>
            updateChannel(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: channelsKeys.lists() });
        },
    });
}

export function useDeleteChannel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteChannel(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: channelsKeys.lists() });
        },
    });
}
