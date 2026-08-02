import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { apiFetch } from '../lib/api';
import { toast } from 'react-toastify';

// Personal access tokens, for non-browser clients (the Chrome extension) that
// can't hold a Clerk session. See chrome-extension-pat-implementation-plan.md.

export interface PATSummary {
    id: string;
    label: string;
    created_at: string;
    last_used_at: string | null;
    revoked_at: string | null;
}

export interface CreateTokenResponse {
    id: string;
    token: string; // plaintext -- only ever present in this one response
    label: string;
    created_at: string;
}

export const tokenKeys = {
    all: ['tokens'] as const,
};

// --- Queries ---

export function useTokens() {
    const { getToken } = useAuth();
    return useQuery({
        queryKey: tokenKeys.all,
        queryFn: async () => {
            const res = await apiFetch('/tokens', {}, getToken);
            if (!res.ok) throw new Error('Failed to fetch tokens');
            const data = (await res.json()) as { tokens: PATSummary[] };
            return data.tokens;
        },
    });
}

// --- Mutations ---

export function useCreateTokenMutation() {
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (label: string) => {
            const res = await apiFetch('/tokens', {
                method: 'POST',
                body: JSON.stringify({ label }),
            }, getToken);
            if (!res.ok) throw new Error('Failed to create token');
            return (await res.json()) as CreateTokenResponse;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tokenKeys.all });
        },
        onError: (error: Error) => {
            toast.error(`Failed to create token: ${error.message}`);
        }
    });
}

export function useRevokeTokenMutation() {
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiFetch(`/tokens/${id}`, {
                method: 'DELETE',
            }, getToken);
            if (!res.ok) throw new Error('Failed to revoke token');
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tokenKeys.all });
            toast.success('Token revoked');
        },
        onError: (error: Error) => {
            toast.error(`Failed to revoke token: ${error.message}`);
        }
    });
}
