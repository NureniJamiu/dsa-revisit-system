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
