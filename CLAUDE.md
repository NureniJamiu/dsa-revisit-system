# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

DSA Revisit System ("ReStack") — a spaced-repetition tracker for DSA practice problems, with daily email reminders. Go backend + React/TypeScript frontend, PostgreSQL database, Clerk for auth.

## Commands

### Local dev (Docker — preferred)
```bash
docker compose up --build     # backend :8080, frontend :5173, postgres :5432
docker compose down
```

### Backend (Go, in `backend/`)
```bash
go run .                                    # start API server (loads ../.env)
go run . -job=daily                         # run the daily email job once and exit
go run . -job=daily -force                  # same, bypassing the "already sent today" guard
go test ./...                               # run all tests
go test -run TestCalculateWeight_MinimumFloor ./...   # run a single test
go build -o main .
```
The backend requires `DATABASE_URL` to be set (see `.env.example`). `InitDB()` runs idempotent migrations on startup (`runMigrations()` in `db.go`) instead of using a migration tool — new schema changes should follow that `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pattern rather than adding a migration framework.

### Frontend (React/Vite, in `frontend/`)
```bash
npm run dev       # vite dev server
npm run build      # tsc -b && vite build
npm run lint       # eslint .
npm run preview
```

## Architecture

### Backend — single `main` package, file-per-concern (`backend/`)
No internal packages/layers; everything lives in `package main`:
- `main.go` — router setup (chi), CORS, route table, `-job` CLI flag for running the cron job standalone (used by external schedulers).
- `db.go` — `InitDB()`, connection pooling (pgx driver), inline migrations, `FindOrCreateUserByClerkID` (auto-provisions a `users` row on first authenticated request).
- `auth.go` — `ClerkAuthMiddleware`: verifies Clerk JWTs by fetching JWKS from the issuer (`iss` claim) and caching keys for 1h; injects the internal user UUID into request context via `GetUserIDFromContext`. There is no separate "login" endpoint — auth and user provisioning happen together on every protected request.
- `handlers.go` — all HTTP handlers (problems CRUD, revisit history, today's focus, settings, admin/test endpoints).
- `scheduler.go` — the weighted-selection algorithm (`CalculateWeight`, `SelectProblemsSeeded`) that decides which problems to surface.
- `cron.go` — `StartCron()` ticks every minute and calls `RunDailyJob()`, which checks each user's `email_time` preference and `last_email_sent_at` guard before sending.
- `email.go` — `SendEmail()`: sends via the Resend API if `RESEND_API_KEY` is set (requires `EMAIL_FROM` on a Resend-verified domain), otherwise logs the email to stdout ("simulation mode"). This is the default in local dev.
- `models.go` — all structs, including `NullTime` (custom JSON marshaling for nullable timestamps) and `UserPreferences` (JSONB column via `Value`/`Scan`).

Every protected route resolves the caller from context with `userID := GetUserIDFromContext(r)` and every query/mutation filters or checks `WHERE user_id = $N` — there is no separate authorization layer, so new handlers must do this scoping manually.

### The scheduling algorithm (`scheduler.go`)
This is the core domain logic and is easy to get wrong when touched:
- `CalculateWeight(problem)` combines age (sqrt curve), days-since-last-revisit (linear urgency), a revisit-count decay factor, and a "newness cooldown" for problems added in the last 2 days. Weight has a floor of `1.0` — no problem is ever fully unreachable.
- `SelectProblemsSeeded(problems, n, seed)` does weighted-random sampling without replacement. `DaySeed()` derives a seed from the current calendar date, so `GetTodaysFocus` (dashboard) and `RunDailyJob` (email) both produce the *same* selection all day, but a different one the next day.
- `GetTodaysFocus` (in `handlers.go`) queries each problem's state *as of the start of today* (excluding today's own revisits) so the deterministic selection doesn't change if the user revisits a problem partway through the day; it separately tracks `revisited_today` to update the UI without re-rolling the selection.

### Frontend (`frontend/src/`)
- Routing in `App.tsx`: `SignedIn`/`SignedOut` (Clerk) gate between the app `Layout` (Dashboard, Archive, RevisitJournal, ProblemDetail, Settings) and `LandingPage`.
- `lib/api.ts` — `apiFetch()` is the single fetch wrapper; it pulls the Clerk JWT via a passed-in `getToken` and attaches `Authorization: Bearer`. Use this (not raw `fetch`) for all API calls.
- `hooks/useProblems.ts` — all TanStack Query hooks/mutations and the API response TypeScript types live here. Query keys are centralized in `problemKeys`; mutations invalidate `problemKeys.all` (and the specific detail key) on success. Follow this pattern (hook file exporting typed `useQuery`/`useMutation` wrappers) for any new API resource rather than calling `apiFetch` directly from components.
- `providers/Providers.tsx` — wraps the app in a single shared `QueryClient` (5 min stale time, no refetch-on-focus).
- PWA is configured via `vite-plugin-pwa` in `vite.config.ts` (`InstallHint.tsx` handles the install prompt UI).

### Data model
Three tables (`database/schema.sql`): `users` (with JSONB `preferences`: `problems_per_day`, `min_revisit_days`, `max_revisit_days`, `email_time`, `skip_weekends`, `ai_encouragement`), `problems` (`status`: `active`/`retired`), `revisit_history` (append-only log; `problems.times_revisited`/`last_revisited_at` are denormalized aggregates updated transactionally alongside each insert — see `MarkRevisited` in `handlers.go`). There's no migration framework: `database/schema.sql` is the full schema for a fresh install, and `db.go`'s `runMigrations()` applies the same columns idempotently (`ADD COLUMN IF NOT EXISTS`) at every boot so already-deployed databases stay in sync. When adding a column, update both places.

## Deployment

Production is **Heroku** (backend API, app `dsa-revisit-api`), **Supabase** (Postgres — `db.go`'s `InitDB()` has pooler-specific connection-string handling for it), and **Vercel** (frontend). Per `.agents/workflows/commit-and-push.md`: after pushing to `origin main`, if any files under `backend/` changed, also deploy to Heroku:
```bash
git subtree push --prefix backend heroku main
```
Vercel deploys the frontend automatically on push to `origin main`. See `DEPLOYMENT.md` for the full setup. (Render and Fly.io were early prototypes and are not live — don't treat mentions of them elsewhere as current.)

## Known rough edges (intentional, not bugs to silently "fix")

- The cron ticker in `cron.go` fires every **1 minute** — this is deliberate for MVP/testing (guarded by the `last_email_sent_at`-per-day check), not a mistake.
- Email is plain-text only. `TestEmail` (`handlers.go`) is safe as a normal authenticated route — it's scoped to `GetUserIDFromContext(r)` and only ever emails the caller themselves. `RunCronAllUsers` (`POST /api/admin/run-cron`) forces the daily job for *every* user, so it's additionally gated by `RequireAdminSecret` (`auth.go`) — callers must send a matching `X-Admin-Secret` header, set via the `ADMIN_SECRET` env var. That var is empty by default, which fails the route closed (503) until an operator configures it.
