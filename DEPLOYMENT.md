# Deployment Guide: DSA Revisit System

This guide outlines the steps to deploy the DSA Revisit System using free-tier services.

## 1. Database: Supabase (PostgreSQL)

1.  **Create Project**: Go to [supabase.com](https://supabase.com/) and create a new project.
2.  **Get Connection String**:
    *   Navigate to **Project Settings > Database**.
    *   Copy the **URI** connection string.
    *   Ensure it looks like: `postgres://postgres.[USERNAME]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`
3.  **Initialize Schema**:
    *   Go to **SQL Editor** in Supabase.
    *   Copy and paste the contents of `database/schema.sql` from this project and run it.

## 2. Backend: Render (Go Web Service)

1.  **Create Web Service**: Go to [dashboard.render.com](https://dashboard.render.com/) and create a new **Web Service**.
2.  **Connect Repo**: Connect your GitHub repository.
3.  **Config**:
    *   **Root Directory**: `backend`
    *   **Runtime**: `Go`
    *   **Build Command**: `go build -o main .`
    *   **Start Command**: `./main`
4.  **Environment Variables**:
    *   `DATABASE_URL`: (The Supabase URI from step 1).
    *   `CLERK_PUBLISHABLE_KEY`: (From your Clerk dashboard).
    *   `CLERK_SECRET_KEY`: (From your Clerk dashboard).
    *   `FRONTEND_URL`: (You will get this after deploying the frontend in step 3).
    *   `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: (Your email provider settings).

## 3. Frontend: Vercel (React/Vite)

1.  **Create Project**: Go to [vercel.com](https://vercel.com/) and create a new project.
2.  **Connect Repo**: Link the same GitHub repository.
3.  **Config**:
    *   **Root Directory**: `frontend`
    *   **Framework Preset**: `Vite`
4.  **Environment Variables**:
    *   `VITE_API_URL`: (The URL provided by Render, e.g., `https://dsa-backend.onrender.com/api`).
    *   `VITE_CLERK_PUBLISHABLE_KEY`: (From your Clerk dashboard).
5.  **Deploy**: Hit deploy!

## 4. Final Wiring

1.  Once Vercel gives you your frontend URL (e.g., `https://dsa-revisit.vercel.app`), go back to your **Render** dashboard.
2.  Update the `FRONTEND_URL` environment variable with this URL.
3.  Render will automatically redeploy.

---

### Why this stack?
- **Vercel**: Best-in-class for Vite/React applications.
- **Render**: Allows running our Go backend with its built-in cron ticker as a single persistent process on the free tier.
- **Supabase**: Provides a reliable, dedicated Postgres instance with plenty of storage for this use case.
