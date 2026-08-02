// Content script for neetcode.io/problems/* problem pages.
import { registerScraper, scrapeWithSelectors } from "../scrapers/common";

registerScraper(() =>
  scrapeWithSelectors({
    source: "NeetCode",
    titleSelectors: [
      "h1",
      ".problem-title",
      '[class*="ProblemTitle" i]',
    ],
    difficultySelectors: [
      '[class*="difficulty" i]',
      '[class*="Difficulty" i]',
    ],
    titleSuffixes: [" - NeetCode", " | NeetCode"],
  })
);
