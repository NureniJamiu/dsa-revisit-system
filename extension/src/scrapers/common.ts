// Shared scraping helpers used by every per-platform content script
// (src/content-scripts/*.ts). Selectors are best-effort: coding platforms
// change their DOM/CSS class names over time without notice, so every
// lookup here degrades gracefully (og:title / document.title / raw
// location.href) rather than throwing. If a platform redesigns and a
// selector stops matching, the side panel still shows a working manual-entry
// form -- it just won't be prefilled.

export interface ScrapedProblem {
  title: string;
  link: string;
  difficulty: string;
  source: string;
  topics: string[];
}

function firstMatch(selectors: string[]): Element | null {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el && el.textContent?.trim()) return el;
    } catch {
      // Invalid selector for this platform's DOM -- skip it.
    }
  }
  return null;
}

function textFrom(selectors: string[]): string {
  return firstMatch(selectors)?.textContent?.trim() ?? "";
}

function ogTitle(): string {
  const meta = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
  return meta?.content?.trim() ?? "";
}

function canonicalLink(): string {
  const link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  return link?.href || location.href;
}

function cleanDocumentTitle(suffixes: string[]): string {
  let t = document.title;
  for (const suf of suffixes) {
    if (t.toLowerCase().endsWith(suf.toLowerCase())) {
      t = t.slice(0, t.length - suf.length).trim();
      break;
    }
  }
  return t.replace(/\s*[-|]\s*$/, "").trim();
}

const DEFAULT_DIFFICULTY_PATTERN = /\b(basic|school|easy|medium|hard)\b/i;

function normalizeDifficulty(raw: string, pattern: RegExp): string {
  const m = raw.match(pattern);
  if (!m) return "";
  const word = m[1].toLowerCase();
  return word[0].toUpperCase() + word.slice(1);
}

function findDifficultyInText(selectors: string[], pattern: RegExp): string {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      const found = normalizeDifficulty(el?.textContent ?? "", pattern);
      if (found) return found;
    } catch {
      // Invalid selector for this platform's DOM -- skip it.
    }
  }
  return "";
}

export function scrapeWithSelectors(opts: {
  source: string;
  titleSelectors: string[];
  difficultySelectors: string[];
  titleSuffixes: string[];
  difficultyPattern?: RegExp;
}): ScrapedProblem {
  const title = textFrom(opts.titleSelectors) || ogTitle() || cleanDocumentTitle(opts.titleSuffixes);
  const difficulty = findDifficultyInText(
    opts.difficultySelectors,
    opts.difficultyPattern ?? DEFAULT_DIFFICULTY_PATTERN
  );

  return {
    title: title || document.title,
    link: canonicalLink(),
    difficulty,
    source: opts.source,
    topics: [],
  };
}

/** Wires a content script up to respond to on-demand scrape requests from
 * the side panel. Scraping happens live at request time (not cached at
 * page-load), so it reflects whatever's rendered by then. */
export function registerScraper(scrape: () => ScrapedProblem): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "SCRAPE") {
      try {
        sendResponse(scrape());
      } catch (err) {
        console.error("[ReStack] scrape failed", err);
        sendResponse(null);
      }
    }
    return false; // responses here are always synchronous
  });
}
