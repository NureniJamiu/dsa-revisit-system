// Content script for geeksforgeeks.org/problems/* and
// practice.geeksforgeeks.org/problems/* problem pages. GFG uses a wider
// difficulty vocabulary than most platforms (Basic/School in addition to
// Easy/Medium/Hard), handled by common.ts's default difficulty pattern.
import { registerScraper, scrapeWithSelectors } from "../scrapers/common";

registerScraper(() =>
  scrapeWithSelectors({
    source: "GeeksforGeeks",
    titleSelectors: [
      ".problems_header_content__title__L2cB2",
      ".problem-tab h3",
      "div.problem-statement h1",
      "h1",
    ],
    difficultySelectors: [
      '[class*="difficulty" i]',
      ".problem-tab .problems_header_description__difficulty__tag",
      ".problems_header_description__difficulty",
    ],
    titleSuffixes: [" | Practice | GeeksforGeeks", " - GeeksforGeeks"],
  })
);
