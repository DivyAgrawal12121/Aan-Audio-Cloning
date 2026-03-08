import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getStories,
    createStory,
    getStoryDetails,
    deleteStory,
    addStoryItem,
    moveStoryItem,
    trimStoryItem,
    deleteStoryItem,
} from "@resound-studio/api";
import { StoryResponse } from "@resound-studio/shared";

export const storiesKeys = {
    all: ["stories"] as const,
    lists: () => [...storiesKeys.all, "list"] as const,
    details: () => [...storiesKeys.all, "detail"] as const,
    detail: (id: string) => [...storiesKeys.details(), id] as const,
};

export function useStories() {
    return useQuery({
        queryKey: storiesKeys.lists(),
        queryFn: getStories,
    });
}

export function useStoryDetails(storyId: string) {
    return useQuery({
        queryKey: storiesKeys.detail(storyId),
        queryFn: () => getStoryDetails(storyId),
        enabled: !!storyId,
    });
}

export function useCreateStory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; description?: string }) => createStory(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: storiesKeys.lists() });
        },
    });
}

export function useDeleteStory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (storyId: string) => deleteStory(storyId),
        onSuccess: (_, storyId) => {
            queryClient.invalidateQueries({ queryKey: storiesKeys.lists() });
            queryClient.removeQueries({ queryKey: storiesKeys.detail(storyId) });
        },
    });
}

export function useAddStoryItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ storyId, ...data }: { storyId: string; generation_id: string; position_ms: number; track: number }) =>
            addStoryItem(storyId, data),
        onSuccess: (_, { storyId }) => {
            queryClient.invalidateQueries({ queryKey: storiesKeys.detail(storyId) });
        },
    });
}

export function useMoveStoryItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ storyId, itemId, data }: { storyId: string; itemId: string; data: { position_ms: number; track?: number } }) =>
            moveStoryItem(storyId, itemId, data),
        onSuccess: (_, { storyId }) => {
            queryClient.invalidateQueries({ queryKey: storiesKeys.detail(storyId) });
        },
    });
}

export function useTrimStoryItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ storyId, itemId, data }: { storyId: string; itemId: string; data: { trim_start_ms: number; trim_end_ms: number } }) =>
            trimStoryItem(storyId, itemId, data),
        onSuccess: (_, { storyId }) => {
            queryClient.invalidateQueries({ queryKey: storiesKeys.detail(storyId) });
        },
    });
}

export function useDeleteStoryItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ storyId, itemId }: { storyId: string; itemId: string }) => deleteStoryItem(storyId, itemId),
        onSuccess: (_, { storyId }) => {
            queryClient.invalidateQueries({ queryKey: storiesKeys.detail(storyId) });
        },
    });
}
