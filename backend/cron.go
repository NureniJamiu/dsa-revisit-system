package main

import (
	"log"
	"time"

	"github.com/google/uuid"
)

// isWeekend reports whether the given time falls on a Saturday or Sunday.
// Retained as a small shared helper; weekend handling in the live path now
// lives in computeNextSendAt (which rolls a weekend send to Monday in the
// user's own timezone).
func isWeekend(t time.Time) bool {
	day := t.Weekday()
	return day == time.Saturday || day == time.Sunday
}

// timeToSend reports whether now is at or after the user's preferred send
// time ("HH:MM", 24h — matches the format stored by the frontend's Settings
// page, not the "HH:MM AM/PM" display format used in the UI). An empty
// emailTime is treated as "always ready".
//
// The live scheduling path no longer calls this (it uses next_send_at +
// computeNextSendAt), but it's kept and still tested (cron_test.go) as the
// canonical "HH:MM" comparison helper.
func timeToSend(now time.Time, emailTime string) (bool, error) {
	preferredTime, err := time.Parse("15:04", emailTime)
	if err != nil {
		return false, err
	}

	currentHour, currentMinute, _ := now.Clock()
	prefHour := preferredTime.Hour()
	prefMin := preferredTime.Minute()

	if currentHour < prefHour || (currentHour == prefHour && currentMinute < prefMin) {
		return false, nil
	}
	return true, nil
}

// RunDailyJob is the manual/CLI trigger for the send pipeline, now implemented
// on top of the dispatcher + worker queue instead of a full-table scan.
//
//   - force=false: enqueue exactly the users who are currently due
//     (next_send_at <= now), identical to one dispatcher pass, then drain the
//     queue synchronously and return.
//   - force=true: enqueue EVERY user for today regardless of next_send_at /
//     last_email_sent_at (the "run it now for everyone" admin/Heroku-Scheduler
//     semantics the old force flag had), then drain.
//
// It drains synchronously (claim + process until empty) so the CLI/admin caller
// sees the work finish before returning, matching the old behavior where the
// job ran to completion in-process. Returns the number of jobs processed.
func RunDailyJob(force bool) int {
	log.Printf("[Cron] Starting daily job (force=%v)...", force)
	now := time.Now()

	var enqueued int
	if force {
		enqueued = enqueueAllUsers(now)
	} else {
		enqueued = dispatchDueUsers(now)
	}
	log.Printf("[Cron] Enqueued %d job(s); draining...", enqueued)

	processed := drainQueue()
	log.Printf("[Cron] Daily job complete: processed %d job(s)", processed)
	return processed
}

// enqueueAllUsers force-enqueues every user for their local "today", ignoring
// next_send_at and last_email_sent_at. Used by the force path so an operator
// can push a send to the whole base on demand. Idempotent per user/day via the
// send_jobs UNIQUE constraint, so running it twice in a day is safe.
func enqueueAllUsers(now time.Time) int {
	rows, err := db.Query(`SELECT id, timezone FROM users`)
	if err != nil {
		log.Printf("[Cron] enqueueAllUsers query: %v", err)
		return 0
	}
	type u struct {
		id uuid.UUID
		tz string
	}
	var users []u
	for rows.Next() {
		var x u
		if err := rows.Scan(&x.id, &x.tz); err != nil {
			log.Printf("[Cron] enqueueAllUsers scan: %v", err)
			continue
		}
		users = append(users, x)
	}
	rows.Close()

	enqueued := 0
	for _, x := range users {
		runDate := now.In(loadLocation(x.tz))
		inserted, err := enqueueSendJob(x.id, runDate)
		if err != nil {
			log.Printf("[Cron] enqueueAllUsers enqueue %s: %v", x.id, err)
			continue
		}
		if inserted {
			enqueued++
		}
	}
	return enqueued
}

// drainQueue claims and processes jobs until the queue has no more claimable
// work, then returns the count processed. Used by the synchronous CLI/admin
// trigger; the long-running server uses the StartWorkers pool instead.
func drainQueue() int {
	processed := 0
	for {
		jobs, err := claimJobs(workerClaimBatch)
		if err != nil {
			log.Printf("[Cron] drainQueue claim: %v", err)
			return processed
		}
		if len(jobs) == 0 {
			return processed
		}
		for _, job := range jobs {
			processJob(job)
			processed++
		}
	}
}
