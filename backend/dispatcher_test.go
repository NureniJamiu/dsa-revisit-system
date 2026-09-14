package main

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

// setUserSchedule sets a user's timezone and next_send_at directly, for test
// setup. Returns nothing; fails the test on error.
func setUserSchedule(t *testing.T, userID uuid.UUID, tz string, nextSendAt time.Time) {
	t.Helper()
	if _, err := db.Exec(
		`UPDATE users SET timezone = $1, next_send_at = $2 WHERE id = $3`,
		tz, nextSendAt, userID,
	); err != nil {
		t.Fatalf("set user schedule: %v", err)
	}
}

func countJobs(t *testing.T, userID uuid.UUID) int {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM send_jobs WHERE user_id = $1`, userID).Scan(&n); err != nil {
		t.Fatalf("count jobs: %v", err)
	}
	return n
}

func TestDispatchDueUsers_OnlyEnqueuesDue(t *testing.T) {
	setupQueueTestDB(t)

	now := time.Date(2026, 1, 5, 12, 0, 0, 0, time.UTC) // Monday

	dueUser := makeTestUser(t)
	setUserSchedule(t, dueUser, "UTC", now.Add(-time.Hour)) // due (in the past)

	notDueUser := makeTestUser(t)
	setUserSchedule(t, notDueUser, "UTC", now.Add(time.Hour)) // not due yet

	enqueued := dispatchDueUsers(now)

	if got := countJobs(t, dueUser); got != 1 {
		t.Errorf("due user: expected 1 job, got %d", got)
	}
	if got := countJobs(t, notDueUser); got != 0 {
		t.Errorf("not-due user: expected 0 jobs, got %d", got)
	}
	if enqueued < 1 {
		t.Errorf("expected at least 1 enqueue reported, got %d", enqueued)
	}
}

func TestDispatchDueUsers_AdvancesNextSendAtAndIsIdempotent(t *testing.T) {
	setupQueueTestDB(t)

	now := time.Date(2026, 1, 5, 12, 0, 0, 0, time.UTC) // Monday
	user := makeTestUser(t)
	// email_time 05:00 UTC (from makeTestUser default prefs), tz UTC, due now.
	setUserSchedule(t, user, "UTC", now.Add(-time.Hour))

	// First dispatch enqueues and advances next_send_at past `now`.
	dispatchDueUsers(now)
	if got := countJobs(t, user); got != 1 {
		t.Fatalf("after first dispatch: expected 1 job, got %d", got)
	}

	var nextSendAt time.Time
	if err := db.QueryRow(`SELECT next_send_at FROM users WHERE id = $1`, user).Scan(&nextSendAt); err != nil {
		t.Fatalf("read next_send_at: %v", err)
	}
	if !nextSendAt.After(now) {
		t.Errorf("expected next_send_at advanced past now (%v), got %v", now, nextSendAt)
	}

	// Second dispatch at the same instant: user is no longer due, so no new
	// job. Even if it were, the UNIQUE (user_id, run_date) guard would prevent
	// a duplicate for the same local day.
	dispatchDueUsers(now)
	if got := countJobs(t, user); got != 1 {
		t.Errorf("after second dispatch: expected still 1 job, got %d", got)
	}
}

func TestDispatchDueUsers_UsesLocalRunDateForIdempotency(t *testing.T) {
	setupQueueTestDB(t)

	// A user due right at a UTC-day boundary but in a negative-offset zone
	// should get a run_date on their local (previous) day. Re-dispatching for
	// the same local day must not create a second job.
	now := time.Date(2026, 1, 6, 2, 0, 0, 0, time.UTC) // 21:00 Jan 5 in New_York
	user := makeTestUser(t)
	setUserSchedule(t, user, "America/New_York", now.Add(-time.Minute))

	dispatchDueUsers(now)

	var runDate time.Time
	if err := db.QueryRow(`SELECT run_date FROM send_jobs WHERE user_id = $1`, user).Scan(&runDate); err != nil {
		t.Fatalf("read run_date: %v", err)
	}
	if runDate.Day() != 5 {
		t.Errorf("expected local run_date on Jan 5 (New_York), got %v", runDate)
	}
	if got := countJobs(t, user); got != 1 {
		t.Errorf("expected exactly 1 job, got %d", got)
	}
}

// TestEndToEnd_DispatchThenWorkerAcrossTimezones is the integration test for
// the whole new path: users in different timezones become due at their own
// local reminder time, the dispatcher enqueues only the due ones, a worker
// drains the queue, and each processed user ends up with last_email_sent_at
// stamped and next_send_at advanced. Exercises dispatcher + queue + worker +
// candidate scoring together, without ever full-scanning users on the hot path
// (the dispatcher query is bounded by the next_send_at partial index).
func TestEndToEnd_DispatchThenWorkerAcrossTimezones(t *testing.T) {
	setupQueueTestDB(t)
	t.Setenv("RESEND_API_KEY", "") // dev-mode email: SendEmail returns nil

	now := time.Date(2026, 1, 5, 11, 0, 0, 0, time.UTC) // Monday, 06:00 EST / 03:00 PST

	// dueUser in New_York is past their reminder; notDueUser in Los_Angeles is
	// not yet (03:00 local, reminder 06:00), so only the NY user should send.
	dueUser := makeTestUser(t)
	setUserSchedule(t, dueUser, "America/New_York", now.Add(-time.Hour))
	seedProblemForUser(t, dueUser, 12)

	notDueUser := makeTestUser(t)
	setUserSchedule(t, notDueUser, "America/Los_Angeles", now.Add(2*time.Hour))
	seedProblemForUser(t, notDueUser, 12)

	// Dispatch (enqueue only due) then drain synchronously via the worker path.
	enq := dispatchDueUsers(now)
	if enq < 1 {
		t.Fatalf("expected at least the NY user enqueued, got %d", enq)
	}
	processed := drainQueue()
	if processed < 1 {
		t.Fatalf("expected at least 1 job processed, got %d", processed)
	}

	// Due user: email stamped, schedule advanced, job done.
	lastSent, nextSend := readUserSchedule(t, dueUser)
	if !lastSent.Valid {
		t.Error("due user: expected last_email_sent_at set")
	}
	if !nextSend.Valid || !nextSend.Time.After(now) {
		t.Error("due user: expected next_send_at advanced past now")
	}

	// Not-due user: never enqueued, so untouched.
	if got := countJobs(t, notDueUser); got != 0 {
		t.Errorf("not-due user: expected 0 jobs, got %d", got)
	}
	notDueLast, _ := readUserSchedule(t, notDueUser)
	if notDueLast.Valid {
		t.Error("not-due user: expected last_email_sent_at to remain NULL")
	}
}
