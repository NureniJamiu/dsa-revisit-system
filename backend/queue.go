package main

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

// maxSendAttempts caps how many times a single send_jobs row is retried before
// it's parked in the 'failed' state and no longer claimed. Keeps a permanently
// failing send (e.g. a bad email address) from being retried forever.
const maxSendAttempts = 5

// SendJob is a claimed row from the send_jobs queue.
type SendJob struct {
	ID       uuid.UUID
	UserID   uuid.UUID
	RunDate  time.Time
	Status   string
	Attempts int
}

// enqueueSendJob inserts a pending job for (userID, runDate), or does nothing
// if one already exists for that user/day (idempotent via the UNIQUE
// constraint). Reports whether a new row was actually inserted so the
// dispatcher can count real enqueues. runDate should be the user's local send
// date so "one send per day" is measured in the user's own calendar.
func enqueueSendJob(userID uuid.UUID, runDate time.Time) (bool, error) {
	res, err := db.Exec(`
		INSERT INTO send_jobs (user_id, run_date, status)
		VALUES ($1, $2, 'pending')
		ON CONFLICT (user_id, run_date) DO NOTHING`,
		userID, runDate.Format("2006-01-02"),
	)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		// Some drivers don't report RowsAffected reliably; treat as "maybe
		// inserted" rather than failing the enqueue.
		return true, nil
	}
	return n > 0, nil
}

// claimJobs atomically claims up to batchSize claimable jobs (pending, or
// failed but still under the retry cap) and marks them 'processing'. Uses
// FOR UPDATE SKIP LOCKED so concurrent workers never claim the same row and
// no worker blocks waiting on another's locked rows -- the core primitive that
// makes the worker pool scale horizontally.
//
// The claim runs in a single transaction: the SELECT locks the chosen rows and
// the UPDATE flips them to 'processing' before commit, so once this returns a
// job it's owned by this caller until it's completed or failed.
func claimJobs(batchSize int) ([]SendJob, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback() // no-op after a successful Commit

	rows, err := tx.Query(`
		SELECT id, user_id, run_date, status, attempts
		FROM send_jobs
		WHERE status = 'pending'
		   OR (status = 'failed' AND attempts < $2)
		ORDER BY created_at
		FOR UPDATE SKIP LOCKED
		LIMIT $1`,
		batchSize, maxSendAttempts,
	)
	if err != nil {
		return nil, err
	}

	var jobs []SendJob
	for rows.Next() {
		var j SendJob
		if err := rows.Scan(&j.ID, &j.UserID, &j.RunDate, &j.Status, &j.Attempts); err != nil {
			rows.Close()
			return nil, err
		}
		jobs = append(jobs, j)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close()

	if len(jobs) == 0 {
		// Nothing to claim -- commit (releases the tx) and return empty.
		return nil, tx.Commit()
	}

	ids := make([]string, len(jobs))
	for i, j := range jobs {
		ids[i] = j.ID.String()
	}

	if _, err := tx.Exec(`
		UPDATE send_jobs
		SET status = 'processing', locked_at = NOW(), attempts = attempts + 1, updated_at = NOW()
		WHERE id::text = ANY($1)`,
		ids,
	); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// Reflect the attempts increment we just committed so callers (and
	// failJob's cap check) see the true post-claim count.
	for i := range jobs {
		jobs[i].Attempts++
		jobs[i].Status = "processing"
	}
	return jobs, nil
}

// completeJob marks a claimed job done. Terminal state -- a done row is never
// claimed again (the claimable index excludes it) and its UNIQUE (user_id,
// run_date) row blocks re-enqueue for the same day.
func completeJob(jobID uuid.UUID) error {
	_, err := db.Exec(`
		UPDATE send_jobs
		SET status = 'done', locked_at = NULL, last_error = NULL, updated_at = NOW()
		WHERE id = $1`,
		jobID,
	)
	return err
}

// failJob records a failed attempt. If the job has reached maxSendAttempts it
// is parked in 'failed' and left out of future claims; otherwise it goes back
// to 'pending' so a later claimJobs pass retries it. Since claimJobs already
// incremented attempts, the cap is checked against the current (post-claim)
// attempts value.
func failJob(jobID uuid.UUID, attempts int, cause string) error {
	nextStatus := "pending"
	if attempts >= maxSendAttempts {
		nextStatus = "failed"
	}
	_, err := db.Exec(`
		UPDATE send_jobs
		SET status = $2, locked_at = NULL, last_error = $3, updated_at = NOW()
		WHERE id = $1`,
		jobID, nextStatus, truncateError(cause),
	)
	return err
}

// truncateError bounds an error string so a pathological driver/HTTP error
// can't bloat the last_error column. Kept small and dependency-free.
func truncateError(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	const max = 1000
	if len(s) > max {
		s = s[:max]
	}
	return sql.NullString{String: s, Valid: true}
}
