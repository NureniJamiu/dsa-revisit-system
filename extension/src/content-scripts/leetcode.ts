// Content script for leetcode.com/problems/* problem pages.
import { registerScraper, scrapeWithSelectors } from "../scrapers/common";

registerScraper(() =>
  scrapeWithSelectors({
    source: "LeetCode",
    titleSelectors: [
      '[data-cy="question-title"]',
      "div.text-title-large a",
      "div.text-title-large",
      'a.no-underline[href*="/problems/"]',
      "h1",
    ],
    difficultySelectors: [
      '[class*="text-difficulty"]',
      '[diff]',
      '[class*="difficulty" i]',
    ],
    titleSuffixes: [" - LeetCode"],
  })
);
