/**
 * Centralized API fetch helper that attaches the Clerk JWT token.
 * All components should use this instead of raw `fetch()`.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/**
 * Make an authenticated API request.
 * @param path  - API path relative to base, e.g. '/problems'
 * @param options - Standard fetch options (method, body, etc.)
 * @param getToken - Function from Clerk's useAuth().getToken
 */
export async function apiFetch(
    path: string,
    options: RequestInit = {},
    getToken: () => Promise<string | null>
): Promise<Response> {
    const token = await getToken();

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Auto-set Content-Type for JSON bodies (if body exists and Content-Type isn't set)
    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    return fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });
}
