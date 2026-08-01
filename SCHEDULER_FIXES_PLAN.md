# Scheduler/Settings fix plan

Covers the three backend logic bugs from the dashboard punch list, plus one blocking bug found while scoping them.

## 0. Settings save silently zeroes scheduling prefs (blocker, do first)

`Settings.tsx`'s `UserSettings` type and `handleSave` only send `daily_problems`, `skip_weekends`, `email_time`, `ai_encouragement`. The backend's `UserPreferences` JSON tags are `problems_per_day`, `min_revisit_days`, `max_revisit_days`, `email_time`, `skip_weekends`, `ai_encouragement`. `UpdateSettings` (`handlers.go`) does a full-struct `json.Decode` and overwrites the whole `preferences` column, so any field name that doesn't match its Go tag decodes to its zero value.

Net effect: every time a user hits "Save changes," `problems_per_day`, `min_revisit_days`, and `max_revisit_days` all get reset to `0` in the DB — `min_revisit_days: 0` makes every problem instantly "eligible" again, which quietly defeats the whole revisit-cadence logic. This has nothing to do with the punch list originally, but items 1 and 2 below both build on `min_revisit_days`/`max_revisit_days` being trustworthy, so it needs to land first.

Fix: rename `Settings.tsx`'s `UserSettings` fields to match the backend JSON tags (`problems_per_day`, `min_revisit_days`, `max_revisit_days`), add `min_revisit_days` and `max_revisit_days` inputs to the form (or merge-patch on the backend instead of full overwrite — but matching field names is the smaller, more honest fix and also unblocks item 1's UI needs). Update `GetSettings`/`UpdateSettings` are otherwise fine as-is.

Verify: save settings from the UI, confirm via `GET /api/settings` (or direct DB read) that all six fields persist correctly, not just the four currently wired up.

## 1. `max_revisit_days` dead setting

Currently defined in `UserPreferences` (`models.go`), defaulted in `db.go`'s seed JSON, and covered by a JSON round-trip test (`models_test.go`) — but never read in `scheduler.go` or `handlers.go`. A problem can sit unrevisited indefinitely if it keeps losing the weighted draw, since `CalculateWeight`'s floor of `1.0` makes it *unlikely* to be silenced but never *guarantees* resurfacing.

Decision needed: implement, since removing it means also deleting the DB column/default and the existing test, and the "guarantee resurfacing eventually" behavior is a reasonable product feature (recommend keeping and implementing).

Implementation:
- Add `MaxRevisitDays` as a parameter to `SelectProblemsSeeded` (or compute the overdue set at each call site and splice it in before calling `SelectProblemsSeeded`).
- At each of the three call sites that build an eligible pool (`GetTodaysFocus`, `TestEmail`, `RunDailyJob` in `cron.go`), after the existing `min_revisit_days` filter, compute `overdue := problems where daysSinceLast >= MaxRevisitDays` (using the same per-call "days since last" values already computed there) and force-include any overdue problem into the `eligible`/`selected` set ahead of the weighted draw, even if `n` (problems-per-day) has to expand by the overdue count, or overdue problems are guaranteed slots and the weighted draw fills the rest.
- Recommend: overdue problems get guaranteed slots (capped at `problems_per_day`, oldest-overdue-first if more overdue than slots), and the weighted draw only fills remaining slots from the rest of the eligible pool. This keeps `problems_per_day` as a hard ceiling instead of letting it balloon.
- `0` should mean "disabled" (no forced resurfacing) to match how `EmailTime: ""` is treated as "always ready" elsewhere in this codebase — needed since existing users may have `max_revisit_days: 0` from the item-0 bug before that's fixed.

Files: `scheduler.go` (new param/logic), `handlers.go` (`GetTodaysFocus`, `TestEmail`), `cron.go` (`RunDailyJob`).

Tests: extend `scheduler_test.go` — a problem past `max_revisit_days` should always appear in `SelectProblemsSeeded`'s output regardless of weight/seed; confirm `problems_per_day` slot cap still holds when overdue count exceeds it.

## 2. `GetAllWeights` hardcodes `min_revisit_days = 2`

`handlers.go:464` calls `CalculateProblemWeight(p, 2)` instead of the user's actual preference, so the sortable weights table's `is_eligible` column is wrong for any user who isn't on the default. `GetTodaysFocus` already does this correctly (fetches `user.Preferences` first, passes `user.Preferences.MinRevisitDays`).

Fix: mirror `GetTodaysFocus`'s pattern in `GetAllWeights` — query `preferences` for `userID` before the problems query, pass `user.Preferences.MinRevisitDays` into `CalculateProblemWeight`. Same fix applies to `GetProblemWeight` (`handlers.go:431`), which has the identical hardcoded `2` and wasn't in the original punch list but has the same bug.

Files: `handlers.go` (`GetAllWeights`, `GetProblemWeight`).

Tests: no existing handler-level tests for these two functions (confirm before assuming coverage) — add a quick test or manual check with a non-default `min_revisit_days` to confirm `is_eligible` flips correctly.

## 3. No per-topic balancing in `SelectProblemsSeeded`

Correction from the first draft of this plan: `Topic` is **not** actually populated or user-facing today. `problems.topic` exists as a DB column and `Problem.Topic` is read/rendered conditionally in `Dashboard.tsx` (`{item.problem.topic && (...)}`) and colored via `topicColors.ts`, but there is no input for it anywhere — `AddProblemModal.tsx` only has title, link, difficulty, source, notes. So every problem's `topic` is `''`, the badge's truthy-check never passes, and that's why nothing shows up in the UI. Topic-balancing the scheduler is meaningless until topics can actually be assigned, so this item now has a real prerequisite (3a) before the algorithm work (3b). It also needs to support a problem belonging to more than one topic, per your note, which changes the storage design and the balancing algorithm itself — this is no longer a small isolated `scheduler.go` change, it's a small feature (topic tagging) plus the balancing logic.

### 3a. Add topic data: storage + input UI

Storage decision — a problem can belong to multiple topics, so a single `VARCHAR(255)` column won't hold this cleanly:

- **Option A — comma-separated string in the existing `topic` column.** No migration. But every current/future reader of `p.Topic` (Dashboard's exact-match filter `p.topic === topicFilter`, the badge render, `GetAllWeights`/`GetTodaysFocus` if they ever group by topic) has to be rewritten to split/join a list, plus you need to escape or forbid commas in topic names. Fragile, not recommended.
- **Option B — junction table (recommended).** Add `problem_topics(problem_id UUID REFERENCES problems(id) ON DELETE CASCADE, topic VARCHAR(255))`, no separate `topics` lookup table needed since topics are free text, not a controlled vocabulary. Fits the project's existing idempotent-migration convention (`CREATE TABLE IF NOT EXISTS` in both `database/schema.sql` and `db.go`'s `runMigrations()`, same pattern already used for column additions). Leave the old `problems.topic` column in place but stop reading it, consistent with the codebase's "never remove, only add" migration philosophy.

With option B: `Problem` (`models.go`) gets a `Topics []string` field populated via a join/subquery everywhere a problem is currently scanned — `GetAllWeights`, `GetTodaysFocus`, `TestEmail`, `RunDailyJob`, `Archive`/list endpoints, `ProblemDetail`. That's a real blast radius, not a one-line change; budget for touching every query in `handlers.go` and `cron.go` that currently does `SELECT ... FROM problems`.

Frontend: add a multi-select/tag input to `AddProblemModal.tsx` (reuse `topicColors.ts` for chip styling), send `topics: string[]` in the add/update payload, update `handlers.go`'s create/update handlers to delete+reinsert the problem's rows in `problem_topics` on save (simplest correct approach for a small list). Update `Dashboard.tsx`'s filter (`problem.topics.includes(topicFilter)`) and badge rendering (one badge per topic) to work over an array instead of a single string.

No backfill script needed — existing problems just start with zero topics and users tag them going forward (optionally, a "bulk-apply topic to selected problems" affordance in the Dashboard would help retroactive tagging, but it's a nice-to-have, not required to unblock 3b).

### 3b. Topic-balanced selection (multi-topic aware)

Because a problem can carry multiple topics, "group by topic and round-robin" (my original suggestion) doesn't work — there's no single bucket to put a 2-topic problem in. A better fit, given `SelectProblemsSeeded` already recomputes `CalculateWeight` for every remaining problem on every draw of its loop: add a coverage-penalty multiplier instead of bucketing.

- Track a `topicsAlreadySelected` set, empty at the start of each call.
- On every draw, weight each remaining problem as `CalculateWeight(p) * topicPenalty(p, topicsAlreadySelected)`, where the penalty shrinks as more of that problem's topics are already represented among the picks so far — floored above zero, same "never fully silenced" philosophy as `CalculateWeight`'s own `1.0` floor.
- After a pick, add all of that problem's topics to `topicsAlreadySelected` before the next draw.
- Untagged problems (empty `Topics`) are exempt from the penalty and don't contribute to `topicsAlreadySelected` — they shouldn't be punished for data that doesn't exist yet, especially right after 3a ships when most problems will still be untagged.

This changes `SelectProblemsSeeded`'s output for the same seed, so `DaySeed()`-based determinism (same selection all day) still holds, but Today's Focus will visibly differ once topics exist — worth a heads-up, not a silent behavior change.

Files: `database/schema.sql`, `db.go` (`runMigrations`), `models.go` (`Problem.Topics []string`), `handlers.go` (every problem-scanning query, plus create/update), `cron.go`, `scheduler.go` (`SelectProblemsSeeded`); frontend: `AddProblemModal.tsx`, `Dashboard.tsx`, `hooks/useProblems.ts` (types), `lib/topicColors.ts` (likely fine as-is, already keyed by topic string).

Tests: extend `scheduler_test.go` — a pool with 8 problems tagged `"DP"` and one each of two other topics should not select all-DP when `n` covers all distinct topics; add a problem tagged `{"DP", "Arrays"}` and confirm it counts against both topics' coverage once picked.

## Suggested order

Item 0 first (it's silently corrupting data on every settings save). Then item 2 (smallest, isolated fix, good warm-up). Then item 1 (touches 3 call sites, needs the settings fix from item 0 to be trustworthy). Item 3 is now the biggest item by far — schema change plus new UI plus a multi-label balancing algorithm — so treat it as a separate follow-up piece of work rather than bundling it with the other three, which are all same-day-sized fixes.
