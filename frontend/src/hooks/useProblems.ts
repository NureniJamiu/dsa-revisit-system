import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { apiFetch } from '../lib/api';

export interface Problem {
    id: string;
    title: string;
    link: string;
    times_revisited: number;
    last_revisited_at: string | null;
    difficulty?: string;
    source?: string;
    tags?: string[];
}

export interface WeightInfo {
    weight: number;
    priority: 'high' | 'medium' | 'low';
    revisit_decay: number;
    days_since_last_revisit: number;
    is_eligible: boolean;
    days_since_added?: number;
    times_revisited?: number;
}

export interface TodaysFocusItem {
    problem: Problem;
    weight: WeightInfo;
    revisited_today: boolean;
}

export interface TodaysFocusResponse {
    problems: TodaysFocusItem[];
    summary: {
        total_focus: number;
        completed: number;
        remaining: number;
    };
}

export interface RevisitEntry {
    id: string;
    revisited_at: string;
    notes?: string;
}

export interface ProblemDetailResponse extends Problem {
    revisited_today?: boolean;
    revisit_history?: RevisitEntry[];
    weight_info?: WeightInfo;
}

// Keys for Query Caching
export const problemKeys = {
    all: ['problems'] as const,
    lists: () => [...problemKeys.all, 'list'] as const,
    today: () => [...problemKeys.all, 'today'] as const,
    details: () => [...problemKeys.all, 'detail'] as const,
    detail: (id: string) => [...problemKeys.details(), id] as const,
};

// --- Queries ---

export function useProblems() {
    const { getToken } = useAuth();
    return useQuery({
        queryKey: problemKeys.lists(),
        queryFn: async () => {
            const res = await apiFetch('/problems', {}, getToken);
            if (!res.ok) throw new Error('Failed to fetch problems');
            return (await res.json()) as Problem[];
        },
    });
}

export function useTodaysFocus() {
    const { getToken } = useAuth();
    return useQuery({
        queryKey: problemKeys.today(),
        queryFn: async () => {
            const res = await apiFetch('/problems/today', {}, getToken);
            if (!res.ok) throw new Error('Failed to fetch today\'s focus');
            return (await res.json()) as TodaysFocusResponse;
        },
    });
}

export function useProblem(id: string | undefined) {
    const { getToken } = useAuth();
    return useQuery({
        queryKey: problemKeys.detail(id || ''),
        queryFn: async () => {
            if (!id) throw new Error('Problem ID is required');
            const res = await apiFetch(`/problems/${id}`, {}, getToken);
            if (!res.ok) throw new Error('Failed to fetch problem detail');
            return (await res.json()) as ProblemDetailResponse;
        },
        enabled: !!id,
    });
}

// --- Mutations ---

export function useAddProblemMutation() {
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<Problem>) => {
            const res = await apiFetch('/problems', {
                method: 'POST',
                body: JSON.stringify(data),
            }, getToken);
            if (!res.ok) throw new Error('Failed to add problem');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: problemKeys.all });
        },
    });
}

export function useUpdateProblemMutation() {
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Problem> }) => {
            const res = await apiFetch(`/problems/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            }, getToken);
            if (!res.ok) throw new Error('Failed to update problem');
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: problemKeys.all });
            queryClient.invalidateQueries({ queryKey: problemKeys.detail(variables.id) });
        },
    });
}

export function useDeleteProblemMutation() {
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiFetch(`/problems/${id}`, {
                method: 'DELETE',
            }, getToken);
            if (!res.ok) throw new Error('Failed to delete problem');
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: problemKeys.all });
        },
    });
}

export function useRevisitProblemMutation() {
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
            const res = await apiFetch(`/problems/${id}/revisit`, {
                method: 'POST',
                body: notes ? JSON.stringify({ notes }) : undefined,
            }, getToken);

            if (!res.ok && res.status !== 409) {
                throw new Error('Failed to mark revisited');
            }

            return { id, alreadyRevisited: res.status === 409 };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: problemKeys.all });
            queryClient.invalidateQueries({ queryKey: problemKeys.detail(variables.id) });
        },
    });
}

export function useArchiveProblemMutation() {
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiFetch(`/problems/${id}/archive`, {
                method: 'POST',
            }, getToken);
            if (!res.ok) throw new Error('Failed to archive problem');
            return id;
        },
        onSuccess: (id) => {
            queryClient.invalidateQueries({ queryKey: problemKeys.all });
            queryClient.invalidateQueries({ queryKey: problemKeys.detail(id) });
        },
    });
}
