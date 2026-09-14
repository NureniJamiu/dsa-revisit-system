# Deployment Guide: DSA Revisit System

This is the actual production setup: **Heroku** for the backend API, **Supabase** for Postgres, **Vercel** for the frontend. Other providers (Render, Fly.io) were evaluated early on but aren't used — see the note at the bottom if you find leftover references to them.

## 1. Database: Supabase (PostgreSQL)

1.  **Create Project**: Go to [supabase.com](https://supabase.com/) and create a new project.
2.  **Get Connection String**:
    *   Navigate to **Project Settings > Database**.
    *   Copy the **URI** connection string (pooler mode) — it looks like `postgres://postgres.[USERNAME]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`.
    *   `backend/db.go`'s `InitDB()` detects `pooler.supabase.com` (or port `6543`) in the connection string and automatically appends `default_query_exec_mode=simple_protocol`, which the Supabase pooler requires — no extra config needed for that.
3.  **Initialize the schema** (one-time, against the fresh Supabase database — `backend/db.go`'s `runMigrations()` only handles incremental `ALTER TABLE` changes for an *existing* schema, it does not create tables):
    *   Go to **SQL Editor** in Supabase, paste the contents of `database/schema.sql`, and run it.
    *   Or from the CLI: `psql "<supabase-uri>" -f database/schema.sql`.

## 2. Backend: Heroku

1.  **Create the app** (already done for the live deployment — `dsa-revisit-api`):
    ```bash
    heroku create dsa-revisit-api
    ```
2.  **Set config vars**:
    ```bash
    heroku config:set --app dsa-revisit-api \
      DATABASE_URL="<supabase-uri-from-step-1>" \
      CLERK_PUBLISHABLE_KEY=pk_... \
      CLERK_SECRET_KEY=sk_... \
      FRONTEND_URL=https://your-app.vercel.app \
      ADMIN_SECRET=... \
      SMTP_HOST=... SMTP_PORT=... SMTP_USER=... SMTP_PASS=...
    ```
    > Email delivery is being migrated from SMTP to the Resend HTTP API (`RESEND_API_KEY`, `EMAIL_FROM`) in a separate branch of work — once that lands, swap the `SMTP_*` vars above for those instead. See `EMAIL_SETUP_GUIDE.md`.
3.  **Deploy**: per `.agents/workflows/commit-and-push.md`, every push to `origin main` that touches `backend/` is followed by:
    ```bash
    git subtree push --prefix backend heroku main
    ```
    Heroku's Go buildpack builds `backend/` and runs it via `backend/Procfile` (`web: bin/dsa-revisit`).

## 2b. Scheduler: dispatcher + worker queue (replaces the old cron scan)

The daily-reminder scheduler no longer scans the whole `users` table every minute. The `web` dyno now runs, in-process:

- a **dispatcher** that every ~30s enqueues only users whose `next_send_at` has passed (an index range-scan over `idx_users_next_send_at`, not a full-table scan), and
- a **worker pool** that drains the `send_jobs` queue in parallel (`SELECT ... FOR UPDATE SKIP LOCKED`), scoring each user's problems in SQL and sending their email.

Both start automatically from `backend/main.go` (`StartDispatcher()` + `StartWorkers(...)`) — no separate dyno or Heroku Scheduler entry is required for the normal path.

### Config vars

Add these to the existing `heroku config:set --app dsa-revisit-api` command:

```bash
heroku config:set --app dsa-revisit-api \
  RESEND_API_KEY=re_... \
  EMAIL_FROM="ReStack <reminders@yourdomain>" \
  WORKER_POOL_SIZE=4
```

- **`WORKER_POOL_SIZE`** (optional, default `4`): number of worker goroutines draining the queue. Keep it comfortably below your Postgres/pooler connection limit — each busy worker holds a connection while sending. On a single dyno with the Supabase pooler, `4`–`8` is a reasonable range; raise it only if the queue backs up during the busiest send window.
- **`RESEND_API_KEY` / `EMAIL_FROM`**: required for real email delivery. If `RESEND_API_KEY` is unset the pipeline runs in simulation mode (emails are logged, not sent) — see `EMAIL_SETUP_GUIDE.md`. If `RESEND_API_KEY` is set, `EMAIL_FROM` **must** also be set or sends fail.

### One-time migration step (required on first deploy of this change)

The schema migration (`runMigrations()` in `backend/db.go`, plus `database/schema.sql` for fresh installs) adds the `timezone` and `next_send_at` columns and the `send_jobs` table idempotently on boot. But existing users start with `next_send_at = NULL`, which the dispatcher skips — so **they won't receive reminders until their schedule is backfilled**. After deploying, run once:

```bash
heroku run --app dsa-revisit-api bin/dsa-revisit -job backfill-schedule
```

This computes `next_send_at` for every user with a NULL value from their timezone + reminder time. It is idempotent (only touches NULL rows), so it's safe to re-run. Until a user picks a timezone in Settings, they default to `UTC` (the reminder time is interpreted as UTC); once they set one, `UpdateSettings` recomputes `next_send_at` immediately.

### Rollout order

1. Deploy the new backend (columns + `send_jobs` table are created on boot by `runMigrations()`; a fresh Supabase database instead gets them from `database/schema.sql` in step 1).
2. Run `-job backfill-schedule` (above) so existing users enter the dispatcher's window.
3. Deploy the frontend so users can pick their timezone.

### Manual / admin triggers (unchanged semantics)

The old operational hooks still work, now implemented on the queue:

- `bin/dsa-revisit -job daily` — enqueue currently-due users and drain synchronously, then exit (e.g. a belt-and-suspenders Heroku Scheduler entry).
- `bin/dsa-revisit -job daily -force` — enqueue **all** users for today regardless of `next_send_at` / `last_email_sent_at`, then drain. Use to push a send to the whole base on demand.
- `POST /api/admin/run-cron` (guarded by `ADMIN_SECRET`) — same as `-job daily -force`, returns a JSON summary with the number of jobs processed.

## 3. Frontend: Vercel

1.  **Project**: connected to the GitHub repo (`origin`), root directory `frontend`, framework preset `Vite`. Deploys automatically on push to `main`.
2.  **Environment Variables**:
    *   `VITE_API_URL`: your Heroku app's API URL, e.g. `https://dsa-revisit-api.herokuapp.com/api`.
    *   `VITE_CLERK_PUBLISHABLE_KEY`: from your Clerk dashboard.

## 4. Final Wiring

After the first Vercel deploy, update Heroku's `FRONTEND_URL` config var to the Vercel URL so CORS (`backend/main.go`) allows requests from it:
```bash
heroku config:set --app dsa-revisit-api FRONTEND_URL=https://your-app.vercel.app
```

---

## Troubleshooting

### ❌ Error: `network is unreachable` (IPv6 Issue)
If you see logs like `dial tcp [2a05:...]:5432: connect: network is unreachable`, the dyno is trying to reach Supabase over IPv6, which isn't always reachable.

**Fix**:
1. Go to Supabase **Settings > Database**.
2. Find the **Connection Pooler** section.
3. Select **Mode: Session** (or Transaction).
4. Copy the pooler **URI** (`...pooler.supabase.com...`, IPv4) and set it as Heroku's `DATABASE_URL`.

---

## Abandoned alternatives (do not follow)

Two other setups were prototyped but are not live and shouldn't be used as deployment instructions:

- **Render**: no live Render service backs this app — Heroku is the real backend host.
- **Fly.io**: no `fly.toml` remains in the repo — it was removed as an unused experiment (the app name `dsa-revisit-api` was reused for the real Heroku app).
