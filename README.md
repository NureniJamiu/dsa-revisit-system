# DSA Revisit System ("ReStack")

A production-grade, full-stack spaced-repetition tracking system designed to help software engineers master Data Structures & Algorithms (DSA). ReStack combines a modern React dashboard, a high-performance Go API server, automated daily email notifications, and a multi-platform Chrome extension to build an end-to-end problem review workflow.

---

## Key Features

- 🧠 **Smart Spaced Repetition**: Proprietary scheduling algorithm based on calendar date seeds, problem age, revisit frequency, urgency weighting, and initial cooldowns.
- 📬 **Daily Email Summaries**: Automated scheduled notifications sent via Resend API (or logged locally in simulation mode) tailored to each user's preferred delivery time (`email_time`).
- 🧩 **Multi-Platform Chrome Extension**: One-click problem ingestion from **LeetCode**, **GeeksforGeeks**, **HackerRank**, and **NeetCode** with an integrated side-panel UI.
- 🔐 **Dual Authentication System**:
  - **Browser Sessions**: Secure Clerk OAuth & JWT authentication.
  - **API / Extension Access**: User-generated Personal Access Tokens (PATs) hashed with SHA-256.
- 📊 **Interactive Analytics Dashboard**: Topic distribution breakdown, difficulty metrics, activity heatmap calendar, and problem detail journals.
- ⚙️ **Idempotent Migration Engine**: Zero-downtime database schema auto-migrations built directly into the Go backend.
- 📱 **Progressive Web App (PWA)**: Mobile-optimized experience with offline service workers and install prompts.

---

## Tech Stack

| Domain | Technology | Details |
|---|---|---|
| **Backend API** | Go 1.24+ | Chi v5 Router, Jackc/pgx v5 driver, Go-Chi CORS |
| **Frontend SPA** | React 19, TypeScript 5.9 | Vite 7, Tailwind CSS v4, TanStack Query v5 |
| **Chrome Extension** | Manifest V3 | TypeScript, ESBuild, Side Panel API, Content Scripts |
| **Authentication** | Clerk & Custom PATs | Clerk JWKS verification, SHA-256 hashed PATs |
| **Database** | PostgreSQL 15+ | Transaction/Session connection pooling support |
| **Email Delivery** | Resend API / SMTP | Resend HTTP API with stdout fallback simulation mode |
| **Deployment** | Heroku, Vercel, Supabase | Docker & Docker Compose support for local development |

---

## Architecture Overview

### System Architecture

```
[ Chrome Extension ] ──(PAT Auth)───┐
                                    ▼
[ Web Application  ] ──(Clerk JWT)───► [ Go API Server (Chi) ]
                                            │        │
                                   (pgx v5) │        │ (Resend HTTP / SMTP)
                                            ▼        ▼
                                   [ PostgreSQL ]  [ Resend Email API ]
```

### Directory Structure

```
.
├── backend/                        # Go REST API Server
│   ├── auth.go                     # Clerk JWT verification & PAT authentication middleware
│   ├── cron.go                     # Daily email scheduler & background ticker
│   ├── db.go                       # Database initialization, pgx pooler, & inline migrations
│   ├── email.go                    # Resend API & stdout email driver
│   ├── handlers.go                 # HTTP request handlers (CRUD, focus, settings, PATs)
│   ├── main.go                     # Application entry point, router setup, & CLI flag parser
│   ├── models.go                   # Data models, JSONB scanners, & NullTime helpers
│   ├── pat.go                      # Personal Access Token generation & verification logic
│   ├── scheduler.go                # Spaced repetition weighting & seeded selection algorithm
│   ├── Dockerfile                  # Production container definition for API server
│   └── Procfile                    # Heroku deployment process definition
├── frontend/                       # React 19 + TypeScript SPA
│   ├── src/
│   │   ├── components/             # UI components (Layout, Header, Navigation, Modals)
│   │   ├── hooks/                  # TanStack Query hooks (useProblems.ts)
│   │   ├── lib/                    # API client wrapper (apiFetch) & utilities
│   │   ├── pages/                  # Application views (Dashboard, ProblemDetail, Settings, etc.)
│   │   ├── providers/              # React Query Client provider setup
│   │   └── App.tsx                 # Route management & Clerk authentication gates
│   ├── vite.config.ts              # Vite bundler & PWA plugin configuration
│   └── Dockerfile                  # Production container definition for frontend
├── extension/                      # Chrome Extension (Manifest V3)
│   ├── src/                        # Content scripts & side panel components
│   ├── sidepanel/                  # HTML entry point for side panel UI
│   ├── manifest.json               # Extension permissions & site match rules
│   └── build.mjs                   # ESBuild configuration for extension assets
├── database/                       # Database Resources
│   └── schema.sql                  # Canonical PostgreSQL DDL schema definition
└── docker-compose.yml              # Local multi-container development environment
```

---

## Spaced Repetition Algorithm

ReStack surfaces problems to review each day using a deterministic weighted-sampling algorithm (`backend/scheduler.go`):

1. **Weight Calculation (`CalculateWeight`)**:
   - **Age Factor**: Sub-linear square-root growth based on days since the problem was added ($\sqrt{\text{days}}$).
   - **Urgency Factor**: Linear scaling based on elapsed days since the last revisit.
   - **Frequency Decay**: Exponential damping based on total times revisited ($\frac{1}{1 + 0.5 \times \text{times\_revisited}}$).
   - **Newness Cooldown**: Problems added within the last 48 hours receive a 50% temporary weight reduction to allow initial learning.
   - **Minimum Floor**: Every problem maintains a minimum weight floor of `1.0` so no problem becomes permanently unreachable.

2. **Deterministic Daily Selection (`SelectProblemsSeeded`)**:
   - A calendar date seed (`DaySeed`) is derived from `YYYY-MM-DD`.
   - Weighted pseudo-random sampling without replacement ensures that every user sees the **exact same focus list** throughout the day across both the Web Dashboard and Daily Email, regardless of how many times the page is refreshed or API requested.

---

## Database Schema

```
                       +-----------------------+
                       |         users         |
                       +-----------------------+
                       | id (UUID, PK)         |
                       | clerk_id (VARCHAR)    |<--------------+
                       | email (VARCHAR)       |               |
                       | name (VARCHAR)        |               |
                       | preferences (JSONB)   |               |
                       | last_email_sent_at    |               |
                       +-----------------------+               |
                                  |                            |
          +-----------------------+-----------------------+    |
          | 1:N                                           | 1:N|
          v                                               v    |
+-------------------+                           +--------------------------+
|     problems      |                           | personal_access_tokens   |
+-------------------+                           +--------------------------+
| id (UUID, PK)     |                           | id (UUID, PK)            |
| user_id (FK)      |                           | user_id (FK)             |
| title, link       |                           | token_hash (TEXT, UNIQUE)|
| difficulty, status|                           | label, created_at        |
| times_revisited   |                           | last_used_at, revoked_at |
| last_revisited_at |                           +--------------------------+
+-------------------+
  |               |
  | 1:N           | 1:N
  v               v
+-------------------+   +--------------------+
|  revisit_history  |   |   problem_topics   |
+-------------------+   +--------------------+
| id (UUID, PK)     |   | problem_id (FK, PK)|
| problem_id (FK)   |   | topic (VARCHAR, PK)|
| revisited_at      |   +--------------------+
| notes (TEXT)      |
+-------------------+
```

---

## Prerequisites

Before setting up ReStack locally, ensure you have the following installed:

- **Docker Desktop** (v20.10+) & **Docker Compose** (v2.0+) *(Recommended)*
- **Go** (v1.24 or higher) *(For native backend development)*
- **Node.js** (v20.0 or higher) & **npm** *(For native frontend & extension development)*
- **PostgreSQL** (v15 or higher) *(If running database natively)*
- **Clerk Developer Account** (obtain publishable & secret API keys from [clerk.com](https://clerk.com))

---

## Getting Started

### Option A: Zero-Config Docker Compose (Recommended)

The fastest way to get ReStack running locally:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/dsa-revisit-system.git
   cd dsa-revisit-system
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your Clerk authentication keys:
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

3. **Launch Services**:
   ```bash
   docker compose up --build
   ```

4. **Access Applications**:
   - **Frontend UI**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:8080/api/health](http://localhost:8080/api/health)
   - **PostgreSQL**: `localhost:5432` (`dsa_revisit`)

---

### Option B: Native Local Development

#### 1. Database Setup

Start a local PostgreSQL instance or container:
```bash
docker run --name restack-db -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=dsa_revisit -p 5432:5432 -d postgres:15-alpine
```

Initialize the database schema:
```bash
psql "postgres://user:password@localhost:5432/dsa_revisit?sslmode=disable" -f database/schema.sql
```

#### 2. Backend API Setup (`backend/`)

Navigate to the backend directory and install dependencies:
```bash
cd backend
go mod download
```

Ensure environment variables are configured in `.env` in the root directory, then run the API server:
```bash
go run .
```
*The server will start on port `8080`.*

##### Running Daily Email Job Standalone:
```bash
# Run the daily cron job once for due users
go run . -job=daily

# Force-run the email job bypassing the "already sent today" check
go run . -job=daily -force
```

#### 3. Frontend SPA Setup (`frontend/`)

Navigate to the frontend directory and install dependencies:
```bash
cd frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```
*The application will open at `http://localhost:5173`.*

#### 4. Chrome Extension Setup (`extension/`)

Build the Chrome Extension assets:
```bash
cd extension
npm install
npm run build
```

To load into Chrome:
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle switch in top right corner).
3. Click **Load unpacked** and select the `extension/` directory.

---

## Environment Variables Reference

| Variable | Scope | Description | Default / Example |
|---|---|---|---|
| `DATABASE_URL` | Backend | PostgreSQL connection URI | `postgres://user:password@localhost:5432/dsa_revisit?sslmode=disable` |
| `PORT` | Backend | HTTP server listening port | `8080` |
| `FRONTEND_URL` | Backend | Production Frontend origin for CORS | `https://re-stack.vercel.app` |
| `CLERK_PUBLISHABLE_KEY` | Backend | Clerk Publishable Key for JWT verification | `pk_test_...` |
| `CLERK_SECRET_KEY` | Backend | Clerk Secret Key | `sk_test_...` |
| `CLERK_ISSUER_URL` | Backend | Custom Clerk Issuer URL (optional) | `https://your-app.clerk.accounts.dev` |
| `RESEND_API_KEY` | Backend | Resend HTTP API Key for emails | `re_123456789` |
| `EMAIL_FROM` | Backend | Verified sender email address | `ReStack <notifications@yourdomain.com>` |
| `ADMIN_SECRET` | Backend | Secret header required for `/api/admin/run-cron` | `super-secret-key` |
| `VITE_API_URL` | Frontend | Backend API endpoint URL | `http://localhost:8080/api` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend | Clerk Publishable Key for Client SDK | `pk_test_...` |

---

## Available Scripts & Commands

### Backend Commands (`backend/`)

| Command | Description |
|---|---|
| `go run .` | Start backend HTTP server |
| `go run . -job=daily` | Execute daily email job once and exit |
| `go run . -job=daily -force` | Force daily email job execution bypassing daily guard |
| `go test ./...` | Run all Go unit & integration tests |
| `go test -v -run TestCalculateWeight_MinimumFloor ./...` | Run single specific test function |
| `go build -o dsa-revisit .` | Compile production binary |

### Frontend Commands (`frontend/`)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with hot module replacement |
| `npm run build` | Perform TypeScript type check and compile Vite bundle |
| `npm run lint` | Run ESLint checks across codebase |
| `npm run preview` | Preview production build locally |

### Extension Commands (`extension/`)

| Command | Description |
|---|---|
| `npm run build` | Bundle content scripts and background worker using ESBuild |

---

## Testing & Quality Assurance

### Backend Unit Tests

Run the full Go test suite:
```bash
cd backend
go test -v ./...
```

The backend unit tests cover:
- Weight algorithm mathematical boundary tests (`scheduler_test.go`)
- JWT & Personal Access Token hash validation (`auth_test.go`, `pat_test.go`)
- Cron execution guards and scheduling math (`cron_test.go`)
- Model serialization & custom `NullTime` / JSONB scanning (`models_test.go`)

### Frontend Linting & Type Checking

```bash
cd frontend
npm run lint
npm run build
```

---

## Production Deployment Architecture

The live production deployment follows a decoupled cloud structure:
- **Backend API**: Hosted on **Heroku** (`dsa-revisit-api`)
- **Database**: Hosted on **Supabase PostgreSQL** (using Transaction Connection Pooler)
- **Frontend SPA**: Hosted on **Vercel**

```
[ Vercel Frontend ] ──────────────► [ Heroku API Dyno ]
                                            │
                                            ▼ (Supabase Transaction Pooler)
                                   [ Supabase PostgreSQL ]
```

### 1. Database Setup (Supabase)

1. Create a PostgreSQL project on [supabase.com](https://supabase.com).
2. Obtain the **URI connection string** from **Project Settings > Database** (use **Pooler Mode**).
3. Execute `database/schema.sql` against the database via Supabase SQL Editor or `psql`:
   ```bash
   psql "<SUPABASE_POOLER_URI>" -f database/schema.sql
   ```
   *Note: `backend/db.go` detects `pooler.supabase.com` or port `6543` and automatically attaches `default_query_exec_mode=simple_protocol` required by Supabase poolers.*

### 2. Backend API Deployment (Heroku)

1. Create Heroku App:
   ```bash
   heroku create dsa-revisit-api
   ```
2. Configure Heroku Environment Variables:
   ```bash
   heroku config:set --app dsa-revisit-api \
     DATABASE_URL="<SUPABASE_POOLER_URI>" \
     CLERK_PUBLISHABLE_KEY="pk_live_..." \
     CLERK_SECRET_KEY="sk_live_..." \
     FRONTEND_URL="https://your-app.vercel.app" \
     RESEND_API_KEY="re_..." \
     EMAIL_FROM="notifications@yourdomain.com" \
     ADMIN_SECRET="your-admin-secret"
   ```
3. Deploy Backend via Subtree Push:
   ```bash
   git subtree push --prefix backend heroku main
   ```

### 3. Frontend SPA Deployment (Vercel)

1. Import repository into [Vercel](https://vercel.com).
2. Set Root Directory to `frontend` and Framework Preset to `Vite`.
3. Add Environment Variables:
   - `VITE_API_URL`: `https://dsa-revisit-api.herokuapp.com/api`
   - `VITE_CLERK_PUBLISHABLE_KEY`: `pk_live_...`
4. Deploy!

---

## Troubleshooting Guide

### 1. Supabase IPv6 Connection Failures
- **Symptom**: `dial tcp [2a05:...]:5432: connect: network is unreachable` on Heroku.
- **Solution**: Switch from direct DB host to Supabase **Connection Pooler** URI (`pooler.supabase.com`), which uses IPv4.

### 2. CORS Errors on Web Dashboard
- **Symptom**: Access to fetch at `https://dsa-revisit-api.herokuapp.com/api` from origin `https://your-app.vercel.app` blocked by CORS.
- **Solution**: Ensure `FRONTEND_URL` on Heroku matches your exact Vercel deployment URL (including `https://` without trailing slash).

### 3. Email Simulation Mode vs Resend Delivery
- **Symptom**: Emails are printed to terminal logs instead of landing in inbox.
- **Solution**: Set `RESEND_API_KEY` and ensure `EMAIL_FROM` uses a domain verified inside your Resend control panel.

### 4. Chrome Extension Authentication Errors
- **Symptom**: Extension returns `401 Unauthorized`.
- **Solution**: Navigate to Web Dashboard **Settings > Personal Access Tokens**, generate a new token, and enter it into the Extension side panel.

---

## License

This project is open-source and available under the [MIT License](LICENSE).
