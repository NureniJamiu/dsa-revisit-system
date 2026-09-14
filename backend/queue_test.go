package main

import (
	"database/sql"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// setupQueueTestDB connects to a throwaway/test Postgres via TEST_DATABASE_URL
// and ensures the schema needed by the queue exists. Tests that need a real DB
// skip cleanly when TEST_DATABASE_URL is unset, so the default `go test ./...`
// run (which has no DB) stays green while these still run in CI or locally
// against a real database. It sets the package-global `db` used by the queue
// functions under test.
//
// IMPORTANT: point TEST_DATABASE_URL at a disposable database. These tests
// insert and delete rows in users/send_jobs.
func setupQueueTestDB(t *testing.T) {
	t.Helper()
	connStr := os.Getenv("TEST_DATABASE_URL")
	if connStr == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping DB-backed queue tests")
	}

	conn, err := sql.Open("pgx", connStr)
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}
	if err := conn.Ping(); err != nil {
		t.Fatalf("ping test db: %v", err)
	}
	db = conn

	// The base tables (users, problems, revisit_history) and the uuid-ossp
	// extension live in database/schema.sql, not runMigrations() -- apply it
	// first so the throwaway DB has the full schema, then runMigrations()
	// layers on the additive columns/tables (timezone, next_send_at,
	// send_jobs). Both are idempotent, so this is safe to run every test.
	schemaPath := filepath.Join("..", "database", "schema.sql")
	schemaSQL, err := os.ReadFile(schemaPath)
	if err != nil {
		t.Fatalf("read schema.sql: %v", err)
	}
	if _, err := conn.Exec(string(schemaSQL)); err != nil {
		t.Fatalf("apply schema.sql: %v", err)
	}
	runMigrations() // idempotent; ensures additive columns + send_jobs exist

	t.Cleanup(func() {
		conn.Close()
	})
}

// makeTestUser inserts a minimal user and returns its id, registering cleanup.
func makeTestUser(t *testing.T) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	email := "queue-test-" + uuid.NewString() + "@example.test"
	err := db.QueryRow(`
		INSERT INTO users (email, name, preferences)
		VALUES ($1, 'Queue Test', '{"problems_per_day":3,"min_revisit_days":2,"max_revisit_days":10,"email_time":"05:00","skip_weekends":false,"ai_encouragement":true}')
		RETURNING id`, email).Scan(&id)
	if err != nil {
		t.Fatalf("insert test user: %v", err)
	}
	t.Cleanup(func() {
		db.Exec(`DELETE FROM users WHERE id = $1`, id) // send_jobs cascade
	})
	return id
}

func TestEnqueueSendJob_Idempotent(t *testing.T) {
	setupQueueTestDB(t)
	userID := makeTestUser(t)
	runDate := time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC)

	inserted, err := enqueueSendJob(userID, runDate)
	if err != nil {
		t.Fatalf("first enqueue: %v", err)
	}
	if !inserted {
		t.Fatal("expected first enqueue to insert a row")
	}

	// Same (user, run_date) again -> UNIQUE constraint -> no new row.
	inserted, err = enqueueSendJob(userID, runDate)
	if err != nil {
		t.Fatalf("second enqueue: %v", err)
	}
	if inserted {
		t.Error("expected duplicate enqueue for same (user, run_date) to be a no-op")
	}

	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM send_jobs WHERE user_id = $1`, userID).Scan(&count); err != nil {
		t.Fatalf("count jobs: %v", err)
	}
	if count != 1 {
		t.Errorf("expected exactly 1 job row, got %d", count)
	}
}

func TestClaimJobs_ConcurrentClaimsAreDisjoint(t *testing.T) {
	setupQueueTestDB(t)

	// Enqueue N jobs across N users for the same run_date.
	const n = 20
	runDate := time.Date(2026, 2, 2, 0, 0, 0, 0, time.UTC)
	for i := 0; i < n; i++ {
		uid := makeTestUser(t)
		if _, err := enqueueSendJob(uid, runDate); err != nil {
			t.Fatalf("enqueue: %v", err)
		}
	}

	// Two goroutines claim concurrently; no job id should appear in both.
	var wg sync.WaitGroup
	var mu sync.Mutex
	seen := make(map[uuid.UUID]int)
	claimAll := func() {
		defer wg.Done()
		for {
			jobs, err := claimJobs(3)
			if err != nil {
				t.Errorf("claim: %v", err)
				return
			}
			if len(jobs) == 0 {
				return
			}
			mu.Lock()
			for _, j := range jobs {
				seen[j.ID]++
			}
			mu.Unlock()
		}
	}
	wg.Add(2)
	go claimAll()
	go claimAll()
	wg.Wait()

	for id, c := range seen {
		if c != 1 {
			t.Errorf("job %s claimed %d times, expected exactly once", id, c)
		}
	}
	if len(seen) != n {
		t.Errorf("expected all %d jobs claimed, got %d", n, len(seen))
	}
}

func TestFailJob_RespectsMaxAttempts(t *testing.T) {
	setupQueueTestDB(t)
	userID := makeTestUser(t)
	runDate := time.Date(2026, 3, 3, 0, 0, 0, 0, time.UTC)
	if _, err := enqueueSendJob(userID, runDate); err != nil {
		t.Fatalf("enqueue: %v", err)
	}

	// Claim + fail repeatedly. Before the cap, the job returns to 'pending'
	// and is claimable again; at the cap it parks in 'failed' and disappears
	// from claims.
	var lastStatus string
	for i := 0; i < maxSendAttempts+2; i++ {
		jobs, err := claimJobs(1)
		if err != nil {
			t.Fatalf("claim iteration %d: %v", i, err)
		}
		if len(jobs) == 0 {
			break // parked in failed, no longer claimable
		}
		j := jobs[0]
		if err := failJob(j.ID, j.Attempts, "simulated failure"); err != nil {
			t.Fatalf("failJob: %v", err)
		}
		db.QueryRow(`SELECT status FROM send_jobs WHERE id = $1`, j.ID).Scan(&lastStatus)
	}

	var status string
	var attempts int
	if err := db.QueryRow(`SELECT status, attempts FROM send_jobs WHERE user_id = $1`, userID).Scan(&status, &attempts); err != nil {
		t.Fatalf("read final job: %v", err)
	}
	if status != "failed" {
		t.Errorf("expected job to end 'failed', got %q (attempts=%d)", status, attempts)
	}
	if attempts != maxSendAttempts {
		t.Errorf("expected attempts to cap at %d, got %d", maxSendAttempts, attempts)
	}
}
