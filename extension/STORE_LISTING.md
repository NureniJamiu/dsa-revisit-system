# Microsoft Edge Add-ons & Chrome Web Store listing copy

Reference text for the Developer Dashboard's listing (Microsoft Partner Center / Chrome Web Store) and privacy fields. Copy-paste as needed — trim to fit whatever character limits the current dashboard UI shows you.

## Extension Name
```
Restack
```

## Short description (≤ 132 characters)

```
Add the LeetCode/GFG/HackerRank/NeetCode problem you're viewing to your ReStack spaced-repetition queue in one click.
```

## Detailed description

```
ReStack is a spaced-repetition tracker for DSA (data structures & algorithms) practice problems, with daily email reminders to revisit problems you've already solved.

This extension adds problems to your ReStack queue without leaving the page you're on. While viewing a problem on LeetCode, GeeksforGeeks, HackerRank, or NeetCode, open the extension's side panel and it detects the problem's title, link, and difficulty automatically — edit anything you like, then add it with one click.

Requires a ReStack account (sign up at https://re-stack.vercel.app) and a personal access token, which you generate once from the Settings page and paste into the extension.

What it does:
- Detects the problem on supported platform pages and prefills an add form
- Lets you add topics and notes before saving
- Warns you if you've already added that problem, instead of creating a duplicate
- Everything else — your revisit schedule, streaks, reminders — happens in the ReStack web app

What it doesn't do:
- Track your browsing outside of the four supported problem-page URL patterns
- Share any data with third parties
- Work without a ReStack account
```

## Category

Productivity (or Developer Tools, if offered as a more specific option).

## Privacy practices tab

**Privacy policy URL:**
```
https://re-stack.vercel.app/privacy.html
```

**Single purpose description:**
```
Lets a ReStack user save the coding problem they're currently viewing (on LeetCode, GeeksforGeeks, HackerRank, or NeetCode) to their ReStack spaced-repetition queue in one click, by reading the problem's title/link/difficulty from the page and submitting it to the user's own ReStack account via ReStack's API.
```

**Permission justifications** (one field per permission in the dashboard):

| Permission | Justification |
|---|---|
| `storage` | Stores the user's ReStack personal access token and configured API/app URLs locally in `chrome.storage.local`, so they don't have to reconnect every time the panel opens. |
| `activeTab` / `tabs` | Reads the active tab's URL/title (used as a fallback, and to detect when the tab navigates to a new problem so the panel's detected problem stays in sync) and sends a scrape request to that tab's content script. |
| `sidePanel` | The extension's entire UI lives in a side panel rather than a popup, so the panel and the problem page can both stay visible while adding a problem. |
| `webNavigation` | Uses only `onHistoryStateUpdated` to detect client-side (single-page-app) navigation to a different problem on the same coding platform, so the panel re-checks the page without a manual refresh. |
| `host_permissions`: leetcode.com, geeksforgeeks.org, practice.geeksforgeeks.org, hackerrank.com, neetcode.io | Content scripts run on these sites' problem pages only, to read the problem's title/link/difficulty for the add form. |
| `host_permissions`: dsa-revisit-api-f0dfb5a01997.herokuapp.com, re-stack.vercel.app | The extension calls ReStack's own API to save problems and opens the Settings page where the user generates their access token. |
| `host_permissions`: localhost, 127.0.0.1 | Lets a developer running their own local ReStack instance point the extension at it instead of production. |

**Are you using remote code?** No — everything is bundled at build time (`npm run build`), no `eval`/remote script loading.

**Does this extension collect or use user data?** Yes — a personal access token (authentication data) and the problem data the user chooses to submit. Both should be declared honestly in the dashboard's data-usage checklist; see `../frontend/public/privacy.html` for the exact wording to match.
