import { useSyncExternalStore, useCallback } from 'react';

/**
 * Custom hook to detect if a media query matches.
 * @param query - Media query string, e.g. '(max-width: 768px)'
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback(
        (callback: () => void) => {
            const media = window.matchMedia(query);
            media.addEventListener('change', callback);
            return () => media.removeEventListener('change', callback);
        },
        [query]
    );

    const getSnapshot = () => window.matchMedia(query).matches;
    const getServerSnapshot = () => false;

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

