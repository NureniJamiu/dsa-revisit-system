// chrome.storage.local wrapper for the extension's small bit of persisted
// state. Deliberately storage.local, not localStorage -- localStorage isn't
// available to extension pages in a way that survives consistently across
// contexts, and storage.local is the standard place for this (per the auth
// planning doc).

export interface RestackConfig {
  /** Plaintext PAT (restack_pat_...), or null if not connected yet. */
  token: string | null;
  /** Base URL of the backend API, e.g. http://localhost:8080/api */
  apiBase: string;
  /** Base URL of the web app, used to open the Settings page to mint a token. */
  frontendUrl: string;
}

const DEFAULTS: RestackConfig = {
  token: null,
  apiBase: "http://localhost:8080/api",
  frontendUrl: "http://localhost:5173",
};

const STORAGE_KEY = "restackConfig";

export async function getConfig(): Promise<RestackConfig> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = (result[STORAGE_KEY] as Partial<RestackConfig> | undefined) ?? {};
  return { ...DEFAULTS, ...stored };
}

export async function setConfig(patch: Partial<RestackConfig>): Promise<RestackConfig> {
  const current = await getConfig();
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function clearToken(): Promise<void> {
  await setConfig({ token: null });
}
