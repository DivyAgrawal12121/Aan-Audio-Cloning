import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getModels,
    generateSpeech,
} from "@resound-studio/api";

export const engineKeys = {
    all: ["engine"] as const,
    models: () => [...engineKeys.all, "models"] as const,
};

export function useModels() {
    return useQuery({
        queryKey: engineKeys.models(),
        queryFn: getModels,
    });
}

export function useGenerateSpeech() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: Parameters<typeof generateSpeech>[0]) => generateSpeech(params),
        onSuccess: () => {
            // Invalidate history so new generations show up immediately
            queryClient.invalidateQueries({ queryKey: ["history"] });
        },
    });
}
