// Thin fetch wrapper for the ReStack API. Unlike the web app's apiFetch
// (frontend/src/lib/api.ts), there's no Clerk getToken() here -- the
// extension isn't a Clerk-aware context, so every request just attaches the
// stored personal access token directly (see chrome-extension-pat-implementation-plan.md).

import { getConfig } from "./storage";

export class ApiError extends Error {
  status: number;
  /** Parsed JSON error body, when the response had one (e.g. CreateProblem's
   * 409 duplicate response includes an `existing` problem alongside the
   * error message). Undefined if the body wasn't JSON or couldn't be read. */
  data?: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/** Shape of CreateProblem's 409 response body -- see duplicateProblem /
 * findActiveProblemByLink in backend/handlers.go. */
export interface DuplicateProblemError {
  error: string;
  existing: { id: string; title: string; link: string };
}

export interface UserPreferences {
  problems_per_day: number;
  min_revisit_days: number;
  max_revisit_days: number;
  email_time: string;
  skip_weekends: boolean;
  ai_encouragement: boolean;
}

export interface CreateProblemPayload {
  title: string;
  link: string;
  difficulty?: string;
  source?: string;
  notes?: string;
  topics?: string[];
}

export interface Problem {
  id: string;
  title: string;
  link: string;
  status: string;
  difficulty?: string;
  source?: string;
  notes?: string;
  topics?: string[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiBase, token } = await getConfig();
  if (!token) {
    throw new ApiError(401, "Not connected");
  }

  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let data: unknown;
    let message = text || `Request failed (${res.status})`;
    try {
      data = JSON.parse(text);
      if (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string") {
        message = (data as { error: string }).error;
      }
    } catch {
      // Body wasn't JSON (e.g. a plain http.Error string) -- message already
      // falls back to the raw text above.
    }
    throw new ApiError(res.status, message, data);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

/** Validates a token/apiBase pair by hitting a cheap authenticated route.
 * Used at connect-time, before the pair is saved to storage. */
export async function validateToken(apiBase: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function createProblem(payload: CreateProblemPayload): Promise<Problem> {
  return request<Problem>("/problems", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
