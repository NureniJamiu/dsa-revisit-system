package main

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"
)

// workerPollInterval is how long a worker waits before polling again when it
// found no claimable jobs, so an idle queue doesn't busy-loop the DB.
const workerPollInterval = 5 * time.Second

// workerClaimBatch is how many jobs a single worker claims per poll. Small so
// work spreads across the pool rather than one worker grabbing everything.
const workerClaimBatch = 10

// defaultWorkerPoolSize is used when WORKER_POOL_SIZE is unset or invalid.
// Small by default so a single-dyno deployment doesn't overwhelm the DB
// connection pool; scale up via the env var on larger deployments.
const defaultWorkerPoolSize = 4

// workerPoolSize returns the configured number of worker goroutines, from the
// WORKER_POOL_SIZE env var, falling back to defaultWorkerPoolSize.
func workerPoolSize() int {
	if v := os.Getenv("WORKER_POOL_SIZE"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
		log.Printf("[Worker] Invalid WORKER_POOL_SIZE %q, using default %d", v, defaultWorkerPoolSize)
	}
	return defaultWorkerPoolSize
}

// StartWorkers launches n worker goroutines that drain the send_jobs queue.
// Each worker independently claims jobs (FOR UPDATE SKIP LOCKED makes this safe
// to run concurrently) and processes them. Runs until the process exits.
func StartWorkers(n int) {
	if n < 1 {
		n = 1
	}
	for i := 0; i < n; i++ {
		go workerLoop(i)
	}
	log.Printf("[Worker] Started %d worker(s)", n)
}

// workerLoop is one worker's claim/process cycle. It drains as many jobs as it
// can each pass, then sleeps briefly when the queue is empty.
func workerLoop(id int) {
	for {
		jobs, err := claimJobs(workerClaimBatch)
		if err != nil {
			log.Printf("[Worker %d] claim error: %v", id, err)
			time.Sleep(workerPollInterval)
			continue
		}
		if len(jobs) == 0 {
			time.Sleep(workerPollInterval)
			continue
		}
		for _, job := range jobs {
			processJob(job)
		}
	}
}

// processJob turns a single claimed job into a sent email and an advanced
// schedule. On any failure before the email is sent (or the send itself
// failing) it calls failJob so the job is retried or parked; only a fully
// successful send commits completion + the next schedule.
//
// This shares the exact scoring/selection path as the API (loadCandidates +
// SelectProblemsWithOverdue), so the email a user gets matches what
// Today's Focus would show: SQL prunes+scores the candidate pool, Go does the
// stateful topic-balanced, overdue-guaranteed, day-seeded final pick.
func processJob(job SendJob) {
	now := time.Now()

	// Load the user (email + preferences + timezone) fresh, so a preferences
	// change since enqueue is honored at send time.
	var u User
	err := db.QueryRow(
		`SELECT id, email, preferences, timezone FROM users WHERE id = $1`,
		job.UserID,
	).Scan(&u.ID, &u.Email, &u.Preferences, &u.Timezone)
	if err != nil {
		log.Printf("[Worker] job %s: load user %s failed: %v", job.ID, job.UserID, err)
		failJob(job.ID, job.Attempts, fmt.Sprintf("load user: %v", err))
		return
	}

	// SQL-scored candidate pool (a handful of rows, not all the user's
	// problems), then the stateful Go pick over just that pool.
	cands, err := loadCandidates(u.ID, now, u.Preferences)
	if err != nil {
		log.Printf("[Worker] job %s: loadCandidates failed: %v", job.ID, err)
		failJob(job.ID, job.Attempts, fmt.Sprintf("load candidates: %v", err))
		return
	}

	problems := candidateProblems(cands)
	attachTopics(problems) // only the handful; keeps the topic query tiny

	focusCount := u.Preferences.ProblemsPerDay
	if len(problems) < focusCount {
		focusCount = len(problems)
	}
	toSend := SelectProblemsWithOverdue(problems, focusCount, DaySeed(), u.Preferences.MaxRevisitDays)

	// Nothing eligible today: this is a successful no-op, not a failure. Mark
	// done and advance the schedule so we don't retry an empty send all day.
	if len(toSend) == 0 {
		log.Printf("[Worker] job %s: no eligible problems for %s, marking done", job.ID, u.Email)
		finishJob(job, u, now)
		return
	}

	if err := SendEmail(u.Email, toSend); err != nil {
		log.Printf("[Worker] job %s: send to %s failed: %v", job.ID, u.Email, err)
		failJob(job.ID, job.Attempts, fmt.Sprintf("send email: %v", err))
		return
	}

	finishJob(job, u, now)
	log.Printf("[Worker] job %s: sent %d problem(s) to %s", job.ID, len(toSend), u.Email)
}

// finishJob commits the terminal side effects of a successful send in one
// transaction: stamp last_email_sent_at, recompute next_send_at
// authoritatively from the user's full current preferences (this is the source
// of truth -- it supersedes the dispatcher's optimistic advance at enqueue
// time), and mark the job done. Doing all three together means a crash can't
// leave a "sent but not rescheduled" or "rescheduled but still pending" state.
func finishJob(job SendJob, u User, now time.Time) {
	next := computeNextSendAt(now, u.Timezone, u.Preferences.EmailTime, u.Preferences.SkipWeekends)
	// Guard against a non-advancing result (empty email_time returns now) so a
	// user can't get stuck perpetually due.
	if !next.After(now) {
		next = now.AddDate(0, 0, 1)
	}

	tx, err := db.Begin()
	if err != nil {
		log.Printf("[Worker] job %s: begin tx failed: %v", job.ID, err)
		// The email already went out; fail the job so it's retried. Retrying
		// re-sends (at-least-once delivery) -- acceptable for a reminder, and
		// the UNIQUE(user_id,run_date) guard prevents a *second* job for the
		// same day, bounding duplicates to retry attempts on this one job.
		failJob(job.ID, job.Attempts, fmt.Sprintf("begin tx: %v", err))
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec(
		`UPDATE users SET last_email_sent_at = $1, next_send_at = $2 WHERE id = $3`,
		now, next, u.ID,
	); err != nil {
		log.Printf("[Worker] job %s: update user failed: %v", job.ID, err)
		failJob(job.ID, job.Attempts, fmt.Sprintf("update user: %v", err))
		return
	}

	if _, err := tx.Exec(
		`UPDATE send_jobs SET status = 'done', locked_at = NULL, last_error = NULL, updated_at = NOW() WHERE id = $1`,
		job.ID,
	); err != nil {
		log.Printf("[Worker] job %s: mark done failed: %v", job.ID, err)
		failJob(job.ID, job.Attempts, fmt.Sprintf("mark done: %v", err))
		return
	}

	if err := tx.Commit(); err != nil {
		log.Printf("[Worker] job %s: commit failed: %v", job.ID, err)
		failJob(job.ID, job.Attempts, fmt.Sprintf("commit: %v", err))
		return
	}
}
