-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- NOTE: This file is the full schema for a fresh install (e.g. a new Supabase
-- project, per DEPLOYMENT.md). Once a database exists, backend/db.go's
-- runMigrations() also applies idempotent `ALTER TABLE ... ADD COLUMN IF NOT
-- EXISTS` statements at boot, so already-deployed databases stay in sync
-- without needing this file re-run. When adding a new column, add it to BOTH
-- runMigrations() (for existing databases) AND here (so a fresh install
-- doesn't have to wait for that migration to run).

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    preferences JSONB DEFAULT '{"problems_per_day": 3, "min_revisit_days": 2, "max_revisit_days": 10, "email_time": "05:00", "skip_weekends": false, "ai_encouragement": true}',
    last_email_sent_at TIMESTAMP WITH TIME ZONE,
    -- Per-user IANA timezone; next_send_at is computed in this zone from
    -- preferences.email_time (+ skip_weekends). See backend/schedule.go.
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    -- Next UTC instant this user is due for their daily email. The dispatcher
    -- range-scans WHERE next_send_at <= now() instead of scanning all users.
    next_send_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Problems Table
CREATE TABLE IF NOT EXISTS problems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    link TEXT NOT NULL,
    date_added TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_revisited_at TIMESTAMP WITH TIME ZONE,
    times_revisited INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active', -- active, retired
    topic VARCHAR(255),
    difficulty VARCHAR(50), -- Easy, Medium, Hard
    source VARCHAR(255) DEFAULT 'LeetCode',
    notes TEXT
);

-- Revisit History Table
CREATE TABLE IF NOT EXISTS revisit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    revisited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Problem Topics Table (many-to-many: a problem can belong to multiple topics)
-- NOTE: problems.topic (singular column, above) predates this and is no
-- longer written to or read from -- left in place rather than dropped, per
-- this project's "never remove, only add" migration convention.
CREATE TABLE IF NOT EXISTS problem_topics (
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    topic VARCHAR(255) NOT NULL,
    PRIMARY KEY (problem_id, topic)
);

-- Personal Access Tokens Table (non-Clerk auth for clients that aren't a
-- browser tab, e.g. the Chrome extension -- see chrome-extension-pat-implementation-plan.md).
-- token_hash is a SHA-256 hex digest; the plaintext token is only ever
-- returned once, at creation time, and never stored. revoked_at is a soft
-- delete so last_used_at history survives for the settings page.
CREATE TABLE IF NOT EXISTS personal_access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL DEFAULT 'Chrome extension',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- Send Jobs Queue Table
-- Postgres-backed work queue; workers claim rows via FOR UPDATE SKIP LOCKED.
-- UNIQUE (user_id, run_date) makes enqueue idempotent (one send per user/day).
CREATE TABLE IF NOT EXISTS send_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    run_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, done, failed
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    locked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, run_date)
);

-- Index for scheduling queries
CREATE INDEX IF NOT EXISTS idx_problems_user_scheduling ON problems(user_id, status, last_revisited_at);
-- Dispatcher due-user lookup: partial index so only scheduled users are indexed
CREATE INDEX IF NOT EXISTS idx_users_next_send_at ON users(next_send_at) WHERE next_send_at IS NOT NULL;
-- Worker claim scan: index only claimable jobs so done rows don't slow it down
CREATE INDEX IF NOT EXISTS idx_send_jobs_claimable ON send_jobs(created_at) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_revisit_history_problem ON revisit_history(problem_id, revisited_at DESC);
CREATE INDEX IF NOT EXISTS idx_problem_topics_problem ON problem_topics(problem_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_pat_token_hash ON personal_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_pat_user ON personal_access_tokens(user_id) WHERE revoked_at IS NULL;
