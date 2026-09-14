package main

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

// seedProblemForUser inserts one active problem added daysAgo days ago (never
// revisited), so it's eligible and scores above the floor.
func seedProblemForUser(t *testing.T, userID uuid.UUID, daysAgo float64) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	added := time.Now().Add(-time.Duration(daysAgo * 24 * float64(time.Hour)))
	err := db.QueryRow(`
		INSERT INTO problems (user_id, title, link, date_added, status)
		VALUES ($1, 'Two Sum', 'https://leetcode.com/problems/two-sum', $2, 'active')
		RETURNING id`, userID, added).Scan(&id)
	if err != nil {
		t.Fatalf("seed problem: %v", err)
	}
	return id
}

func readUserSchedule(t *testing.T, userID uuid.UUID) (lastSent NullTime, nextSend NullTime) {
	t.Helper()
	if err := db.QueryRow(
		`SELECT last_email_sent_at, next_send_at FROM users WHERE id = $1`, userID,
	).Scan(&lastSent, &nextSend); err != nil {
		t.Fatalf("read user schedule: %v", err)
	}
	return
}

func readJobStatus(t *testing.T, jobID uuid.UUID) (status string, attempts int) {
	t.Helper()
	if err := db.QueryRow(
		`SELECT status, attempts FROM send_jobs WHERE id = $1`, jobID,
	).Scan(&status, &attempts); err != nil {
		t.Fatalf("read job status: %v", err)
	}
	return
}

func TestProcessJob_SuccessMarksDoneAndAdvancesSchedule(t *testing.T) {
	setupQueueTestDB(t)
	// Dev-mode email (no RESEND_API_KEY) -> SendEmail logs and returns nil.
	t.Setenv("RESEND_API_KEY", "")

	userID := makeTestUser(t)
	seedProblemForUser(t, userID, 10) // eligible, not brand new

	runDate := time.Now().AddDate(0, 0, -1) // yesterday's local date
	if _, err := enqueueSendJob(userID, runDate); err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	jobs, err := claimJobs(1)
	if err != nil || len(jobs) != 1 {
		t.Fatalf("claim: %v (n=%d)", err, len(jobs))
	}

	processJob(jobs[0])

	status, _ := readJobStatus(t, jobs[0].ID)
	if status != "done" {
		t.Errorf("expected job done, got %q", status)
	}

	lastSent, nextSend := readUserSchedule(t, userID)
	if !lastSent.Valid {
		t.Error("expected last_email_sent_at to be set")
	}
	if !nextSend.Valid {
		t.Fatal("expected next_send_at to be set")
	}
	if !nextSend.Time.After(time.Now()) {
		t.Errorf("expected next_send_at in the future, got %v", nextSend.Time)
	}
}

func TestProcessJob_SendFailureRetriesWithoutAdvancing(t *testing.T) {
	setupQueueTestDB(t)
	// Force SendEmail to error: API key set but EMAIL_FROM unset makes
	// SendEmail return an error before any network call (see email.go).
	t.Setenv("RESEND_API_KEY", "test-key")
	t.Setenv("EMAIL_FROM", "")

	userID := makeTestUser(t)
	seedProblemForUser(t, userID, 10)

	if _, err := enqueueSendJob(userID, time.Now()); err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	jobs, err := claimJobs(1)
	if err != nil || len(jobs) != 1 {
		t.Fatalf("claim: %v (n=%d)", err, len(jobs))
	}

	processJob(jobs[0])

	status, attempts := readJobStatus(t, jobs[0].ID)
	// Under the retry cap -> back to 'pending' for another attempt.
	if status != "pending" {
		t.Errorf("expected job back to 'pending' after failure, got %q", status)
	}
	if attempts != 1 {
		t.Errorf("expected attempts=1 after one failed claim+process, got %d", attempts)
	}

	// Send failed, so the schedule must NOT have advanced.
	lastSent, _ := readUserSchedule(t, userID)
	if lastSent.Valid {
		t.Error("expected last_email_sent_at to remain NULL after a failed send")
	}
}

func TestProcessJob_NoEligibleProblemsIsSuccessfulNoop(t *testing.T) {
	setupQueueTestDB(t)
	t.Setenv("RESEND_API_KEY", "")

	userID := makeTestUser(t)
	// No problems seeded -> nothing eligible -> no-op success.

	if _, err := enqueueSendJob(userID, time.Now()); err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	jobs, err := claimJobs(1)
	if err != nil || len(jobs) != 1 {
		t.Fatalf("claim: %v (n=%d)", err, len(jobs))
	}

	processJob(jobs[0])

	status, _ := readJobStatus(t, jobs[0].ID)
	if status != "done" {
		t.Errorf("expected empty send to mark job done (no-op), got %q", status)
	}
	_, nextSend := readUserSchedule(t, userID)
	if !nextSend.Valid || !nextSend.Time.After(time.Now()) {
		t.Errorf("expected schedule advanced even on no-op, got valid=%v", nextSend.Valid)
	}
}

func TestProcessJob_AlreadySentTodayIsIdempotent(t *testing.T) {
	setupQueueTestDB(t)
	t.Setenv("RESEND_API_KEY", "")

	userID := makeTestUser(t)
	seedProblemForUser(t, userID, 10)

	runDate := time.Now()
	if _, err := enqueueSendJob(userID, runDate); err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	jobs, _ := claimJobs(1)
	processJob(jobs[0])

	// A second enqueue for the same (user, run_date) is blocked by the UNIQUE
	// constraint, so no duplicate job -> no duplicate send.
	inserted, err := enqueueSendJob(userID, runDate)
	if err != nil {
		t.Fatalf("second enqueue: %v", err)
	}
	if inserted {
		t.Error("expected duplicate enqueue for same day to be a no-op")
	}

	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM send_jobs WHERE user_id = $1`, userID).Scan(&count); err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 1 {
		t.Errorf("expected exactly 1 job for the day, got %d", count)
	}
}
