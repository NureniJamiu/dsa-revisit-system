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

// Defaults point at the real, deployed ReStack -- this is what a Chrome Web
// Store install needs to work out of the box, since a public install has no
// local dev server to fall back to. Anyone running their own fork/instance
// can still repoint both via the "Advanced" section in the connect screen;
// see manifest.json's host_permissions for the fixed set of origins that
// works with (localhost is included there for that case).
const DEFAULTS: RestackConfig = {
  token: null,
  apiBase: "https://dsa-revisit-api-f0dfb5a01997.herokuapp.com/api",
  frontendUrl: "https://re-stack.vercel.app",
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
