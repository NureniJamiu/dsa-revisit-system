# Email Notification Setup Guide

This document walks through every configuration step needed to get the DSA Revisit System's daily email notifications working.

---

## Table of Contents

1. [How It Works — The Pipeline](#1-how-it-works--the-pipeline)
2. [Environment Variables Required](#2-environment-variables-required)
3. [Provider-Specific Setup](#3-provider-specific-setup)
4. [User Configuration (Database)](#4-user-configuration-database)
5. [Docker Compose Configuration](#5-docker-compose-configuration)
6. [Local Development (Without Docker)](#6-local-development-without-docker)
7. [Testing the Email Pipeline](#7-testing-the-email-pipeline)
8. [Known Issues & TODOs](#8-known-issues--todos)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. How It Works — The Pipeline

The email notification system has 4 stages:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌────────────┐
│  Cron Job   │ ──▶ │  Eligibility │ ──▶ │  Weighted   │ ──▶ │   Email    │
│ (cron.go)   │     │   Filter     │     │  Selection  │     │  Delivery  │
│             │     │ (cron.go)    │     │(scheduler.go)│    │ (email.go) │
└─────────────┘     └──────────────┘     └─────────────┘     └────────────┘
  Every 1 min        Active only,         1-3 problems        SMTP or
  (MVP/testing)      min_revisit_days     picked by weight    simulated log
```

### Stage 1: Cron Job (`cron.go`)
- A `time.Ticker` fires **every 1 minute** (for testing; should be changed to once daily in production).
- Iterates over all users in the `users` table.

### Stage 2: Eligibility Filter (`cron.go`)
- For each user, fetches all `active` problems.
- Filters out problems where `days_since_last_revisited < min_revisit_days` (from user preferences).

### Stage 3: Weighted Selection (`scheduler.go`)
- Calls `SelectProblems()` which picks `problems_per_day` problems using weighted randomness.
- Weight formula accounts for age, recency, revisit count, and newness.

### Stage 4: Email Delivery (`email.go`)
- If `SMTP_HOST` env var is set → sends real email via SMTP.
- If `SMTP_HOST` is empty → **simulates** the email by logging it to stdout.

---

## 2. Environment Variables Required

The backend reads these environment variables for email delivery:

| Variable       | Required | Description                              | Example                   |
|----------------|----------|------------------------------------------|---------------------------|
| `SMTP_HOST`    | **Yes**  | SMTP server hostname                     | `smtp.gmail.com`          |
| `SMTP_PORT`    | **Yes**  | SMTP server port                         | `587`                     |
| `SMTP_USER`    | **Yes**  | SMTP username (usually your email)       | `you@gmail.com`           |
| `SMTP_PASS`    | **Yes**  | SMTP password or app password            | `abcd efgh ijkl mnop`     |
| `DATABASE_URL` | Yes      | PostgreSQL connection string (already set)| `postgres://user:pass@...` |
| `PORT`         | No       | Server port (defaults to `8080`)         | `8080`                    |

> **Important:** If `SMTP_HOST` is not set (empty string), the system runs in **simulation mode** — emails are logged to the terminal but not actually sent. This is the current default behavior.

---

## 3. Provider-Specific Setup

### Option A: Gmail (Recommended for MVP)

Gmail is the easiest to set up, but requires an **App Password** (regular password won't work with 2FA).

#### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already on

#### Step 2: Generate an App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select **Mail** as the app, and **Other** as the device (name it "DSA Revisit")
3. Click **Generate**
4. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

#### Step 3: Set Environment Variables
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
```

---

### Option B: Outlook / Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your.email@outlook.com
SMTP_PASS=your_password
```

> **Note:** Microsoft may require an App Password if 2FA is enabled. Generate one at [Microsoft Security](https://account.microsoft.com/security).

---

### Option C: SendGrid (Production-Grade)

For production, a transactional email service like SendGrid is more reliable.

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API key with **Mail Send** permissions
3. Verify your sender email

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxx
```

> SendGrid's SMTP username is literally the string `apikey`, and the password is your API key.

---

### Option D: Mailgun

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your_mailgun_smtp_password
```

---

### Option E: Mailtrap (Testing Only)

[Mailtrap](https://mailtrap.io) catches emails without delivering them — perfect for testing.

1. Sign up at [mailtrap.io](https://mailtrap.io)
2. Create an inbox
3. Copy the SMTP credentials from the inbox settings

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_username
SMTP_PASS=your_mailtrap_password
```

---

## 4. User Configuration (Database)

The cron job reads from the `users` table. Each user has a `preferences` JSONB column:

```json
{
  "problems_per_day": 3,
  "min_revisit_days": 2,
  "max_revisit_days": 10,
  "email_time": "05:00",
  "skip_weekends": false,
  "ai_encouragement": true
}
```

### Key settings that affect emails:

| Setting              | Effect                                                    | Default |
|----------------------|-----------------------------------------------------------|---------|
| `problems_per_day`   | How many problems to include in each daily email          | `3`     |
| `min_revisit_days`   | Minimum days between a problem appearing in emails        | `2`     |
| `email_time`         | Desired delivery time (**not yet enforced in code**)      | `05:00` |
| `skip_weekends`      | Skip emails on weekends (**not yet enforced in code**)    | `false` |

### Updating the default user's email

The seeded default user (`db.go`) has the email `test@example.com`. You **must** change this to your real email:

```sql
UPDATE users
SET email = 'your.real@email.com'
WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
```

Or update `SeedDB()` in `backend/db.go` before first run:

```go
_, err := db.Exec(`
    INSERT INTO users (id, email, name, preferences)
    VALUES ($1, $2, $3, $4)
`, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", "your.real@email.com", "Your Name", "{}")
```

### Updating user preferences

```sql
UPDATE users
SET preferences = '{
  "problems_per_day": 2,
  "min_revisit_days": 3,
  "max_revisit_days": 10,
  "email_time": "07:00",
  "skip_weekends": true,
  "ai_encouragement": true
}'
WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
```

> **Note:** The default seeded user has `preferences = '{}'`, which means the Go struct will use zero-values (`problems_per_day = 0`, `min_revisit_days = 0`). This could result in **0 problems selected**. Fix by updating preferences to sensible defaults.

---

## 5. Docker Compose Configuration

Add the SMTP environment variables to `docker-compose.yml` under the `app-backend` service:

```yaml
services:
  app-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - DATABASE_URL=postgres://user:password@db:5432/dsa_revisit?sslmode=disable
      # Email configuration
      - SMTP_HOST=smtp.gmail.com
      - SMTP_PORT=587
      - SMTP_USER=your.email@gmail.com
      - SMTP_PASS=your_app_password_here
    depends_on:
      db:
        condition: service_started
    networks:
      - dsa-network
```

### Using a `.env` file (recommended)

Instead of hardcoding credentials in `docker-compose.yml`, create a `.env` file:

```bash
# .env (add this to .gitignore!)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_app_password_here
```

Then reference them in `docker-compose.yml`:

```yaml
environment:
  - PORT=8080
  - DATABASE_URL=postgres://user:password@db:5432/dsa_revisit?sslmode=disable
  - SMTP_HOST=${SMTP_HOST}
  - SMTP_PORT=${SMTP_PORT}
  - SMTP_USER=${SMTP_USER}
  - SMTP_PASS=${SMTP_PASS}
```

---

## 6. Local Development (Without Docker)

When running the Go backend directly:

```bash
# Option 1: Export variables in your shell
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your.email@gmail.com
export SMTP_PASS=your_app_password_here

cd backend && go run .

# Option 2: Inline with the command
SMTP_HOST=smtp.gmail.com SMTP_PORT=587 SMTP_USER=you@gmail.com SMTP_PASS=xxxx go run .

# Option 3: No SMTP vars → simulation mode (emails logged to terminal)
go run .
```

---

## 7. Testing the Email Pipeline

### Step 1: Verify simulation mode works

1. Start the backend **without** SMTP vars: `go run .`
2. Watch the terminal logs — every 1 minute you should see:

```
Running daily job...
=== EMAIL SIMULATION ===
To: test@example.com
Subject: DSA Reminder: Problem(s) for today
Hi,

Here's what to revisit today:

1. Two Sum - https://leetcode.com/problems/two-sum/

Keep going!
========================
```

If you see this, the cron → eligibility → selection pipeline is working.

### Step 2: Test with Mailtrap (safe)

Use Mailtrap to verify real SMTP delivery without sending to real inboxes:

```bash
SMTP_HOST=sandbox.smtp.mailtrap.io SMTP_PORT=2525 SMTP_USER=xxx SMTP_PASS=xxx go run .
```

Check the Mailtrap inbox — emails should appear within 1 minute.

### Step 3: Send a real email

Set your real provider's SMTP credentials and make sure the user's `email` column has your real email address.

---

## 8. Known Issues & TODOs

These are items in the current code that need attention for production readiness:

### 🔴 Critical

| Issue | File | Description |
|---|---|---|
| **Cron fires every minute** | `cron.go:10` | The ticker is set to `time.Minute * 1` for testing. In production, this should be a once-daily schedule (e.g., using a proper cron library like `robfig/cron`). Currently, you'll get **an email every minute**. |
| **No "already sent today" guard** | `cron.go:40-42` | There's a comment about checking if an email was already sent today, but no implementation. Without this, the system sends duplicate emails on every tick. |
| **Seeded user has empty preferences** | `db.go:46` | The default user is seeded with `preferences = '{}'`, which means `problems_per_day` defaults to `0` in Go. This silently selects 0 problems. |
| **User email is test@example.com** | `db.go:46` | The seeded user email must be changed to a real address. |

### 🟡 Important

| Issue | File | Description |
|---|---|---|
| **`email_time` preference not enforced** | `cron.go:40` | The user's preferred email time (e.g., `"05:00"`) is stored but never checked. Emails are sent whenever the cron ticks. |
| **`skip_weekends` preference not enforced** | `cron.go` | The weekend skipping preference exists in the schema but is not implemented. |
| **`max_revisit_days` not used** | `cron.go` | Only `min_revisit_days` is used for eligibility. `max_revisit_days` could be used to force-include problems that haven't been seen in too long. |
| **No `From:` header in email** | `email.go:27` | The email message is missing a `From:` header, which may cause delivery issues with some providers. |
| **Email is plain text only** | `email.go:15-29` | No HTML formatting. An HTML template would look much better. |

### 🟢 Nice to Have

| Issue | File | Description |
|---|---|---|
| **No email delivery tracking** | — | No `email_log` table to track what was sent and when. Needed to prevent duplicates and for debugging. |
| **AI encouragement placeholder** | `email.go:24-25` | The AI encouragement feature is stubbed out. |
| **No unsubscribe mechanism** | — | Production emails should include an unsubscribe link. |

---

## 9. Troubleshooting

### "No eligible problems for user"
- **Cause:** Either (a) no active problems exist, or (b) all problems were revisited within the `min_revisit_days` window.
- **Fix:** Add some problems, or check the `min_revisit_days` preference value. If preferences are `'{}'`, the Go zero-value for `min_revisit_days` is `0`, which actually means all problems are always eligible.

### "Error scanning user"
- **Cause:** The `preferences` column has invalid JSON, or the schema doesn't match the Go struct.
- **Fix:** Check the user's `preferences` column: `SELECT preferences FROM users;`

### Email not received (but no errors in logs)
- Check spam/junk folder.
- Verify the `From:` address matches the SMTP_USER.
- Gmail may block "less secure apps" — make sure you're using an App Password.
- Some providers require domain verification (SendGrid, Mailgun).

### "Error sending email: ... authentication failed"
- Double-check `SMTP_USER` and `SMTP_PASS`.
- For Gmail, ensure you're using an **App Password**, not your regular password.
- For Outlook, check if 2FA requires an app password.

### Emails sending too frequently (every minute)
- This is the current MVP behavior (`cron.go:10`).
- For production, change the ticker or switch to a proper cron scheduler.

---

## Quick Start Checklist

```
[ ] 1. Update the seeded user's email to your real email
       → Edit db.go:46 or run SQL UPDATE on users table

[ ] 2. Set user preferences with sensible defaults
       → Run SQL: UPDATE users SET preferences = '{"problems_per_day": 2, "min_revisit_days": 2, ...}'

[ ] 3. Add at least 1 problem to the database
       → Use the frontend's "Add Problem" button

[ ] 4. Set SMTP environment variables
       → SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS

[ ] 5. Start the backend with SMTP vars set
       → SMTP_HOST=smtp.gmail.com ... go run .

[ ] 6. Watch logs for "Running daily job..." and email delivery confirmation

[ ] 7. Check your inbox within 1-2 minutes
```
