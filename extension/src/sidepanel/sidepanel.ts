import { getConfig, setConfig, clearToken } from "../lib/storage";
import { validateToken, createProblem, ApiError } from "../lib/api";
import type { DuplicateProblemError } from "../lib/api";
import type { ScrapedProblem } from "../scrapers/common";

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in sidepanel.html`);
  return found as T;
}

const loadingView = el<HTMLParagraphElement>("loading-view");
const connectView = el<HTMLElement>("connect-view");
const mainView = el<HTMLElement>("main-view");
const connectSuccessOverlay = el<HTMLDivElement>("connect-success-overlay");

const tokenInput = el<HTMLInputElement>("token-input");
const connectBtn = el<HTMLButtonElement>("connect-btn");
const connectError = el<HTMLParagraphElement>("connect-error");
const openSettingsBtn = el<HTMLButtonElement>("open-settings-btn");
const apiBaseInput = el<HTMLInputElement>("api-base-input");
const frontendUrlInput = el<HTMLInputElement>("frontend-url-input");
const saveUrlsBtn = el<HTMLButtonElement>("save-urls-btn");

const detectStatus = el<HTMLSpanElement>("detect-status");
const retryDetectBtn = el<HTMLButtonElement>("retry-detect-btn");
const reloadHint = el<HTMLParagraphElement>("reload-hint");
const addedBanner = el<HTMLDivElement>("added-banner");
const addedBannerTitle = el<HTMLParagraphElement>("added-banner-title");
const addedBannerSubtitle = el<HTMLParagraphElement>("added-banner-subtitle");
const submitError = el<HTMLParagraphElement>("submit-error");

const addForm = el<HTMLFormElement>("add-form");
const titleInput = el<HTMLInputElement>("title-input");
const linkInput = el<HTMLInputElement>("link-input");
const difficultySelect = el<HTMLSelectElement>("difficulty-select");
const sourceSelect = el<HTMLSelectElement>("source-select");
const topicsInput = el<HTMLInputElement>("topics-input");
const notesInput = el<HTMLTextAreaElement>("notes-input");
const submitBtn = el<HTMLButtonElement>("submit-btn");
const changeAccountBtn = el<HTMLButtonElement>("change-account-btn");

let connected = false;
let detecting = false;
let addedBannerTimer: ReturnType<typeof setTimeout> | null = null;
let connectSuccessTimer: ReturnType<typeof setTimeout> | null = null;

// Known platform URL shapes, used only to distinguish "this is a supported
// platform but the content script couldn't be reached" (stale extension
// state, needs a tab reload) from "this genuinely isn't a problem page"
// (normal manual-entry fallback). Kept separate from the content scripts'
// own scraping logic.
const PLATFORM_URL_PATTERNS: Array<{ source: string; pattern: RegExp }> = [
  { source: "LeetCode", pattern: /^https:\/\/leetcode\.com\/problems\// },
  { source: "GeeksforGeeks", pattern: /^https:\/\/(www|practice)\.geeksforgeeks\.org\/problems\// },
  { source: "HackerRank", pattern: /^https:\/\/www\.hackerrank\.com\/challenges\// },
  { source: "NeetCode", pattern: /^https:\/\/neetcode\.io\/problems\// },
];

function detectPlatformFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = PLATFORM_URL_PATTERNS.find((p) => p.pattern.test(url));
  return match?.source ?? null;
}

function showLoading(): void {
  loadingView.hidden = false;
  connectView.hidden = true;
  mainView.hidden = true;
}

function showConnect(): void {
  connected = false;
  loadingView.hidden = true;
  connectView.hidden = false;
  mainView.hidden = true;
}

function showMain(): void {
  connected = true;
  loadingView.hidden = true;
  connectView.hidden = true;
  mainView.hidden = false;
}

async function init(): Promise<void> {
  showLoading();
  const config = await getConfig();
  apiBaseInput.value = config.apiBase;
  frontendUrlInput.value = config.frontendUrl;

  if (!config.token) {
    showConnect();
    return;
  }
  showMain();
  await detectAndPrefill();
}

function hideFeedbackBanners(): void {
  if (addedBannerTimer) {
    clearTimeout(addedBannerTimer);
    addedBannerTimer = null;
  }
  addedBanner.hidden = true;
  addedBanner.classList.remove("fade-out");
  submitError.hidden = true;
}

async function detectAndPrefill(): Promise<void> {
  if (detecting) return;
  detecting = true;
  retryDetectBtn.disabled = true;
  retryDetectBtn.classList.add("spinning");
  reloadHint.hidden = true;
  hideFeedbackBanners();
  detectStatus.textContent = "Checking this page…";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      detectStatus.textContent = "No active tab.";
      return;
    }

    let scraped: ScrapedProblem | null = null;
    try {
      scraped = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE" });
    } catch {
      // No content script listening on this tab -- either it's not a
      // supported platform, or it is one but the script never got injected
      // (e.g. the extension loaded/reloaded after this tab was already open).
      scraped = null;
    }

    if (scraped) {
      detectStatus.textContent = `Detected a ${scraped.source} problem.`;
      titleInput.value = scraped.title;
      linkInput.value = scraped.link;
      difficultySelect.value = scraped.difficulty || "";
      sourceSelect.value = scraped.source;
      return;
    }

    const knownPlatform = detectPlatformFromUrl(tab.url);
    if (knownPlatform) {
      detectStatus.textContent = `This looks like a ${knownPlatform} page, but ReStack couldn't read it.`;
      reloadHint.hidden = false;
      sourceSelect.value = knownPlatform;
    } else {
      detectStatus.textContent =
        "Not a recognized problem page — fill this in manually, or open one on LeetCode, GFG, HackerRank, or NeetCode.";
      sourceSelect.value = "Other";
    }
    titleInput.value = tab.title ?? "";
    linkInput.value = tab.url ?? "";
    difficultySelect.value = "";
  } finally {
    detecting = false;
    retryDetectBtn.disabled = false;
    retryDetectBtn.classList.remove("spinning");
  }
}

retryDetectBtn.addEventListener("click", () => void detectAndPrefill());

function showConnectSuccessThenDetect(): void {
  connectSuccessOverlay.hidden = false;
  const proceed = () => {
    if (connectSuccessTimer) {
      clearTimeout(connectSuccessTimer);
      connectSuccessTimer = null;
    }
    connectSuccessOverlay.hidden = true;
    connectSuccessOverlay.removeEventListener("click", proceed);
    showMain();
    void detectAndPrefill();
  };
  connectSuccessOverlay.addEventListener("click", proceed);
  connectSuccessTimer = setTimeout(proceed, 1100);
}

connectBtn.addEventListener("click", async () => {
  const token = tokenInput.value.trim();
  if (!token) return;

  connectError.hidden = true;
  connectBtn.disabled = true;
  connectBtn.textContent = "Connecting…";

  const config = await getConfig();
  const ok = await validateToken(config.apiBase, token);

  connectBtn.disabled = false;
  connectBtn.textContent = "Connect";

  if (!ok) {
    connectError.textContent = `Couldn't verify that token against ${config.apiBase}. Check the token and the API URL below.`;
    connectError.hidden = false;
    return;
  }

  await setConfig({ token });
  tokenInput.value = "";
  showConnectSuccessThenDetect();
});

openSettingsBtn.addEventListener("click", async () => {
  const { frontendUrl } = await getConfig();
  chrome.tabs.create({ url: `${frontendUrl.replace(/\/$/, "")}/settings` });
});

saveUrlsBtn.addEventListener("click", async () => {
  await setConfig({
    apiBase: apiBaseInput.value.trim(),
    frontendUrl: frontendUrlInput.value.trim(),
  });
  const original = saveUrlsBtn.textContent;
  saveUrlsBtn.textContent = "Saved";
  setTimeout(() => (saveUrlsBtn.textContent = original), 1200);
});

changeAccountBtn.addEventListener("click", async () => {
  await clearToken();
  showConnect();
});

function showAddedBanner(title: string, subtitle: string, variant: "success" | "duplicate" = "success"): void {
  addedBanner.classList.remove("banner-success", "banner-error");
  addedBanner.classList.add(variant === "duplicate" ? "banner-error" : "banner-success");
  addedBannerTitle.textContent = title;
  addedBannerSubtitle.textContent = subtitle;
  addedBanner.hidden = false;
  addedBannerTimer = setTimeout(() => {
    addedBanner.classList.add("fade-out");
    addedBannerTimer = setTimeout(() => {
      addedBanner.hidden = true;
      addedBanner.classList.remove("fade-out");
    }, 400);
  }, 4000);
}

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = "Adding…";
  hideFeedbackBanners();

  const topics = topicsInput.value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const addedTitle = titleInput.value.trim();

  try {
    await createProblem({
      title: addedTitle,
      link: linkInput.value.trim(),
      difficulty: difficultySelect.value || undefined,
      source: sourceSelect.value || undefined,
      notes: notesInput.value.trim() || undefined,
      topics,
    });

    showAddedBanner("Added to ReStack", addedTitle);
    topicsInput.value = "";
    notesInput.value = "";
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await clearToken();
      showConnect();
      return;
    }
    // The backend rejects a second active problem for the same link (see
    // findActiveProblemByLink in backend/handlers.go) rather than silently
    // creating a duplicate. Shown in the same red styling as a real error --
    // not because the request failed, but so it reads as "this didn't
    // happen" rather than blending in with a normal success confirmation.
    if (err instanceof ApiError && err.status === 409) {
      const existingTitle = (err.data as DuplicateProblemError | undefined)?.existing?.title ?? addedTitle;
      showAddedBanner("Already in your ReStack list", existingTitle, "duplicate");
      return;
    }
    submitError.textContent = err instanceof Error ? err.message : "Failed to add problem.";
    submitError.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Add to ReStack";
  }
});

// Keep the form in sync as the user switches tabs or navigates while the
// panel stays open (side panels persist across tab changes, unlike popups).
// Two triggers are needed because coding platforms are SPAs: a full page
// load fires tabs.onUpdated with status "complete", but clicking to a new
// problem within the same site is usually a client-side (History API)
// navigation, which onHistoryStateUpdated catches instead.
chrome.tabs.onActivated.addListener(() => {
  if (connected) void detectAndPrefill();
});
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (connected && (changeInfo.status === "complete" || changeInfo.url)) {
    void detectAndPrefill();
  }
});
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (!connected || details.frameId !== 0) return;
  chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (tab?.id === details.tabId) void detectAndPrefill();
  });
});

void init();
