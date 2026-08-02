# ReStack Chrome extension

Manifest V3 extension. Its one surface is a side panel: open a problem on
LeetCode, GeeksforGeeks, HackerRank, or NeetCode, click the toolbar icon, and
add it to your ReStack queue with the title/link/difficulty prefilled.

Auth is a personal access token (PAT), not Clerk — see
`../chrome-extension-auth-planning.md` and
`../chrome-extension-pat-implementation-plan.md` for why. The extension never
talks to Clerk; it just attaches `Authorization: Bearer <token>` to requests
against the same API the web app uses.

## Build

```bash
npm install
npm run build      # one-off build into dist/ and sidepanel/sidepanel.js
npm run watch       # rebuild on change, for development
npm run typecheck   # tsc --noEmit
```

## Load it in Chrome

1. `npm run build`
2. Go to `chrome://extensions`, enable **Developer mode** (top right).
3. **Load unpacked** → select this `extension/` folder.
4. Click the ReStack icon in the toolbar — it opens the side panel.

## Connect an account

1. In the side panel, expand **Advanced: API & app URLs** and confirm the API
   base URL and app URL match your setup (defaults are
   `http://localhost:8080/api` and `http://localhost:5173`, for local dev
   against `docker compose up`). For a deployed backend, this is your Heroku
   API URL (`https://<app>.herokuapp.com/api`) and Vercel frontend URL.
2. Click **Open ReStack Settings** — it opens `/settings` on the web app in a
   real tab (not inside the panel), since that's a normal Clerk-authenticated
   page load.
3. Generate a token in the **API Tokens** section there, copy it.
4. Paste it into the side panel's token field and click **Connect**. This
   validates the token against `GET /settings` before saving it.

The token is stored in `chrome.storage.local`, not `localStorage` — standard
for extensions, isolated per-extension, survives browser restarts.

## Adding a problem

With an account connected, open a problem page on one of the four supported
platforms and open the side panel. It messages that tab's content script for
a scrape, prefills title/link/difficulty/source, and you can edit anything
(including topics and notes) before submitting. On a page it doesn't
recognize, the form falls back to the tab's title/URL and everything else is
manual. A prominent green banner confirms a successful add; a red one
explains a failure.

The panel re-detects automatically when you switch tabs, when a tab finishes
loading, and (via `chrome.webNavigation.onHistoryStateUpdated`) when you
navigate to a new problem within the same single-page app without a full
reload — which is how clicking to the next problem works on all four
platforms. If it ever still shows a stale/previous problem, use the refresh
icon next to the status line to force a re-check. If that also doesn't fix
it, the panel says so and suggests reloading the tab — this happens if the
extension was installed or reloaded after the tab was already open, since
Chrome doesn't retroactively inject content scripts into existing tabs.

If the stored token is invalid or revoked, the next API call returns 401,
the extension clears the stored token, and the side panel drops back to the
connect screen automatically.

## Styling

`sidepanel/sidepanel.css` copies the relevant CSS custom properties straight
out of `frontend/src/index.css` (the app's dark, Linear-inspired default
theme) and mirrors `ConfirmDialog.tsx`'s modal look for the connect-success
overlay. If the web app's design system changes, re-copy the updated
`:root` values here — there's no shared build step between the two.

## Scraper fragility

`src/content-scripts/*.ts` hold the per-platform CSS selectors, built on
shared helpers in `src/scrapers/common.ts`. Coding platforms redesign their
pages without notice, so every lookup degrades gracefully instead of
throwing: platform selector → `og:title` meta tag → cleaned `document.title`.
If a platform breaks:

1. Open a problem page on that platform, open DevTools, and inspect the
   title/difficulty elements for their current selectors.
2. Update the relevant `titleSelectors` / `difficultySelectors` array in
   `src/content-scripts/<platform>.ts` — add the new selector rather than
   replacing old ones, since selectors are tried in order and multiple can be
   listed for resilience across the platform's own A/B tests or redesign
   rollouts.
3. `npm run build`, reload the extension in `chrome://extensions`, and test
   on a live problem page.

Difficulty parsing accepts `Easy|Medium|Hard|Basic|School` (GFG uses the
extra two). If a platform's difficulty selector matches something without one
of those words, it comes back blank rather than wrong — pick it manually in
the form.

## Notes on permissions

`host_permissions` includes a broad `https://*/*` plus explicit
`localhost`/`127.0.0.1` entries. This is because the API base URL is
user-configurable (dev vs. a deployed backend on any domain), and MV3 extension
pages need a matching host permission to make cross-origin `fetch` calls
without hitting CORS. If you only ever point this at one fixed API domain,
you can narrow `host_permissions` in `manifest.json` to that domain plus the
four scraper domains instead.

## What's not in v1

Per the original plan, this ships add-only: no side-panel view of today's
focus list or a "mark revisited" action yet (`GET /api/problems/today` exists
on the backend and is the natural next step if that's wanted later).
