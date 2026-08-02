// Bundles each extension entry point with esbuild. No frameworks, no CSS
// pipeline -- content scripts and the side panel are plain TS, and
// sidepanel/index.html links its CSS directly (not bundled).
import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const entries = {
  "dist/background": "src/background.ts",
  "dist/content-leetcode": "src/content-scripts/leetcode.ts",
  "dist/content-gfg": "src/content-scripts/gfg.ts",
  "dist/content-hackerrank": "src/content-scripts/hackerrank.ts",
  "dist/content-neetcode": "src/content-scripts/neetcode.ts",
  "sidepanel/sidepanel": "src/sidepanel/sidepanel.ts",
};

const buildOptions = Object.entries(entries).map(([outfile, entry]) => ({
  entryPoints: [entry],
  outfile: `${outfile}.js`,
  bundle: true,
  format: "iife",
  target: "chrome110",
  sourcemap: true,
  logLevel: "info",
}));

if (watch) {
  const contexts = await Promise.all(buildOptions.map((opts) => esbuild.context(opts)));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log("Watching for changes...");
} else {
  await Promise.all(buildOptions.map((opts) => esbuild.build(opts)));
  console.log("Build complete.");
}
