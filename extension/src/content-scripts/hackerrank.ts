// Content script for hackerrank.com/challenges/* challenge/problem pages.
import { registerScraper, scrapeWithSelectors } from "../scrapers/common";

registerScraper(() =>
  scrapeWithSelectors({
    source: "HackerRank",
    titleSelectors: [
      ".challenge-page-label",
      "h1.ui-icon-label",
      "div.hr_tabs-wrapper h1",
      "h1",
    ],
    difficultySelectors: [
      '[class*="difficulty" i]',
      ".difficulty-block .difficulty",
    ],
    titleSuffixes: [" | HackerRank"],
  })
);
