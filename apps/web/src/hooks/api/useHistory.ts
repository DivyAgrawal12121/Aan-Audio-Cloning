import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getHistory,
    deleteHistoryItem,
    clearHistory,
} from "@resound-studio/api";

export const historyKeys = {
    all: ["history"] as const,
    lists: () => [...historyKeys.all, "list"] as const,
    list: (params: any) => [...historyKeys.lists(), params] as const,
};

export function useHistory(params?: {
    profile_id?: string;
    search?: string;
    limit?: number;
    offset?: number;
}) {
    return useQuery({
        queryKey: historyKeys.list(params),
        queryFn: () => getHistory(params),
    });
}

export function useDeleteHistoryItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteHistoryItem(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: historyKeys.lists() });
        },
    });
}

export function useClearHistory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (profileId?: string) => clearHistory(profileId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: historyKeys.lists() });
        },
    });
}
