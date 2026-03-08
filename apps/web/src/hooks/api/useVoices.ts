import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getVoices,
    cloneVoice,
    deleteVoice,
    getVoiceSamples,
    addVoiceSample,
    deleteVoiceSample,
    importVoice,
    VoiceSample
} from "@resound-studio/api";
import type { SavedVoice } from "@resound-studio/shared";

export const voicesKeys = {
    all: ["voices"] as const,
    lists: () => [...voicesKeys.all, "list"] as const,
    details: () => [...voicesKeys.all, "detail"] as const,
    detail: (id: string) => [...voicesKeys.details(), id] as const,
    samples: (id: string) => [...voicesKeys.detail(id), "samples"] as const,
};

export function useVoices() {
    return useQuery({
        queryKey: voicesKeys.lists(),
        queryFn: getVoices,
    });
}

export function useVoiceSamples(voiceId: string) {
    return useQuery({
        queryKey: voicesKeys.samples(voiceId),
        queryFn: () => getVoiceSamples(voiceId),
        enabled: !!voiceId,
    });
}

export function useCloneVoice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (formData: FormData) => cloneVoice(formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: voicesKeys.lists() });
        },
    });
}

export function useDeleteVoice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteVoice(id),
        onSuccess: (_, deletedId) => {
            queryClient.invalidateQueries({ queryKey: voicesKeys.lists() });
            queryClient.removeQueries({ queryKey: voicesKeys.detail(deletedId) });
        },
    });
}

export function useAddVoiceSample() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ voiceId, file, text }: { voiceId: string; file: File; text?: string }) =>
            addVoiceSample(voiceId, file, text),
        onSuccess: (_, { voiceId }) => {
            queryClient.invalidateQueries({ queryKey: voicesKeys.samples(voiceId) });
            queryClient.invalidateQueries({ queryKey: voicesKeys.lists() });
        },
    });
}

export function useDeleteVoiceSample() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ voiceId, sampleId }: { voiceId: string; sampleId: string }) => deleteVoiceSample(voiceId, sampleId),
        onSuccess: (_, { voiceId }) => {
            queryClient.invalidateQueries({ queryKey: voicesKeys.samples(voiceId) });
            queryClient.invalidateQueries({ queryKey: voicesKeys.lists() }); // update sample_count
        },
    });
}

export function useImportVoice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (formData: FormData) => importVoice(formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: voicesKeys.lists() });
        },
    });
}
