package main

import (
	"log"
	"time"

	"github.com/google/uuid"
)

// dispatchInterval is how often the dispatcher polls for due users. A short
// interval keeps reminders close to the user's configured time (the plan's
// "within a few minutes" target) while the WHERE next_send_at <= now() range
// scan over the partial index stays cheap regardless of total user count.
const dispatchInterval = 30 * time.Second

// dispatchBatchSize bounds how many due users are pulled and enqueued per poll,
// so a large backlog (e.g. after downtime) is drained over several polls rather
// than loaded into memory all at once.
const dispatchBatchSize = 1000

// StartDispatcher launches the background loop that enqueues due users. It only
// enqueues -- it never sends -- so it stays fast and the actual work is done by
// the worker pool (Task 6) draining send_jobs. Runs until the process exits.
func StartDispatcher() {
	go func() {
		ticker := time.NewTicker(dispatchInterval)
		defer ticker.Stop()
		// Run once immediately so a freshly-booted process doesn't wait a full
		// interval before catching users who are already due.
		dispatchDueUsers(time.Now())
		for range ticker.C {
			dispatchDueUsers(time.Now())
		}
	}()
}

// dispatchDueUsers enqueues a send job for every user whose next_send_at has
// passed, in batches. run_date is computed in each user's own timezone so the
// UNIQUE (user_id, run_date) idempotency guard measures "one send per day" in
// the user's local calendar, matching how next_send_at was computed.
//
// It advances next_send_at to the following day up front (before the job is
// processed) so the same user isn't re-enqueued on every poll while their job
// sits in the queue. The worker later recomputes next_send_at authoritatively
// from full preferences after sending; this advance is only to get the user
// out of the due window promptly. Returns the number of jobs actually enqueued.
func dispatchDueUsers(now time.Time) int {
	enqueued := 0
	for {
		rows, err := db.Query(`
			SELECT u.id, u.timezone, u.preferences, u.next_send_at
			FROM users u
			WHERE u.next_send_at IS NOT NULL AND u.next_send_at <= $1
			ORDER BY u.next_send_at
			LIMIT $2`,
			now, dispatchBatchSize,
		)
		if err != nil {
			log.Printf("[Dispatcher] Error querying due users: %v", err)
			return enqueued
		}

		type dueUser struct {
			id    uuid.UUID
			tz    string
			prefs UserPreferences
			dueAt time.Time
		}
		var batch []dueUser
		for rows.Next() {
			var d dueUser
			var dueAt NullTime
			if err := rows.Scan(&d.id, &d.tz, &d.prefs, &dueAt); err != nil {
				log.Printf("[Dispatcher] Error scanning due user: %v", err)
				continue
			}
			if dueAt.Valid {
				d.dueAt = dueAt.Time
			} else {
				d.dueAt = now
			}
			batch = append(batch, d)
		}
		rowsErr := rows.Err()
		rows.Close()
		if rowsErr != nil {
			log.Printf("[Dispatcher] Error iterating due users: %v", rowsErr)
			return enqueued
		}

		if len(batch) == 0 {
			return enqueued
		}

		for _, d := range batch {
			// run_date = the local date of the instant the user became due.
			loc := loadLocation(d.tz)
			runDate := d.dueAt.In(loc)

			inserted, err := enqueueSendJob(d.id, runDate)
			if err != nil {
				log.Printf("[Dispatcher] Error enqueueing user %s: %v", d.id, err)
				continue
			}
			if inserted {
				enqueued++
			}

			// Advance next_send_at so this user leaves the due window and isn't
			// re-enqueued next poll. Computed from full preferences (timezone,
			// email_time, skip_weekends) relative to the due instant.
			next := computeNextSendAt(d.dueAt, d.tz, d.prefs.EmailTime, d.prefs.SkipWeekends)
			// Guard against a degenerate no-advance (e.g. empty email_time
			// returning the same instant): force at least the next day so the
			// loop can't spin on the same user forever.
			if !next.After(d.dueAt) {
				next = d.dueAt.AddDate(0, 0, 1)
			}
			if _, err := db.Exec(`UPDATE users SET next_send_at = $1 WHERE id = $2`, next, d.id); err != nil {
				log.Printf("[Dispatcher] Error advancing next_send_at for user %s: %v", d.id, err)
			}
		}

		// If we got a full batch there may be more due users; loop again.
		// A short batch means we've drained the due window for this tick.
		if len(batch) < dispatchBatchSize {
			return enqueued
		}
	}
}
