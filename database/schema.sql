-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    preferences JSONB DEFAULT '{"problems_per_day": 3, "min_revisit_days": 2, "max_revisit_days": 10, "email_time": "05:00", "skip_weekends": false, "ai_encouragement": true}',
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
    source VARCHAR(255) DEFAULT 'LeetCode'
);

-- Revisit History Table
CREATE TABLE IF NOT EXISTS revisit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    revisited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Index for scheduling queries
CREATE INDEX IF NOT EXISTS idx_problems_user_scheduling ON problems(user_id, status, last_revisited_at);
CREATE INDEX IF NOT EXISTS idx_revisit_history_problem ON revisit_history(problem_id, revisited_at DESC);
