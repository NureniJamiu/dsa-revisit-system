package main

import (
	"math"
	"testing"
	"time"

	"github.com/google/uuid"
)

// scoreExprSQL wraps the shared candidateScoreSQL so it can be evaluated in
// isolation for a single set of raw inputs. This is exactly the expression the
// production candidate query uses (candidateScoreSQL), fed the same
// days_added / days_last / times_rev the production CTE would compute -- so a
// match here proves the production score matches CalculateWeight.
const scoreExprSQL = `
SELECT ` + candidateScoreSQL + `
FROM (SELECT
    $1::float8 AS days_added,
    $2::float8 AS days_last,
    $3::int    AS times_rev
) AS scored`

// sqlScore evaluates the SQL scoring expression for one problem's derived
// values, using Postgres so the comparison exercises the real SQL math (double
// precision, sqrt, CASE) rather than a Go re-implementation of it.
func sqlScore(t *testing.T, daysAdded, daysLast float64, timesRev int) float64 {
	t.Helper()
	var score float64
	if err := db.QueryRow(scoreExprSQL, daysAdded, daysLast, timesRev).Scan(&score); err != nil {
		t.Fatalf("sqlScore query: %v", err)
	}
	return score
}

// goScoreFor builds a Problem whose derived days-since values equal the given
// inputs and runs the real CalculateWeight. CalculateWeight uses time.Since
// against the real wall clock, so fixtures MUST be anchored on time.Now() (not
// an arbitrary pinned instant) or the days-since values won't match what we
// feed the SQL expression. We capture time.Now() once per fixture and derive
// DateAdded / LastRevisitedAt from it; the tiny elapsed time between that call
// and CalculateWeight's internal time.Since is absorbed by the test tolerance.
func goScoreFor(daysAdded, daysLast float64, timesRev int, neverRevisited bool) float64 {
	now := time.Now()
	p := Problem{
		ID:             uuid.New(),
		DateAdded:      now.Add(-time.Duration(daysAdded * 24 * float64(time.Hour))),
		TimesRevisited: timesRev,
	}
	if !neverRevisited {
		p.LastRevisitedAt.Valid = true
		p.LastRevisitedAt.Time = now.Add(-time.Duration(daysLast * 24 * float64(time.Hour)))
	}
	return CalculateWeight(p)
}

// TestParity_SQLScoreMatchesCalculateWeight is the guard that keeps the SQL
// scoring in candidates.go from silently drifting from scheduler.go's
// CalculateWeight. It runs a spread of fixtures (never-revisited, high revisit
// count, brand-new < 2 days, long-overdue) through both paths and asserts the
// scores agree within a small tolerance (floating-point + timestamp rounding).
func TestParity_SQLScoreMatchesCalculateWeight(t *testing.T) {
	setupQueueTestDB(t)

	type fixture struct {
		name           string
		daysAdded      float64
		daysLast       float64
		timesRev       int
		neverRevisited bool
	}

	fixtures := []fixture{
		{"fresh, never revisited (day 0)", 0, 0, 0, true},
		{"1 day old, never revisited", 1, 0, 0, true},
		{"2 days old, never revisited", 2, 0, 0, true},
		{"old, never revisited", 30, 0, 0, true},
		{"revisited yesterday, low age", 5, 1, 1, false},
		{"revisited long ago, high age", 100, 40, 3, false},
		{"heavily revisited", 200, 15, 20, false},
		{"overdue-ish, moderate", 60, 25, 5, false},
		{"just added today, revisited (weird but valid)", 0.2, 0.1, 0, false},
	}

	// Tolerance absorbs the sub-millisecond wall-clock drift between building a
	// fixture on time.Now() and CalculateWeight's internal time.Since, plus
	// float64 rounding. It is many orders of magnitude tighter than any real
	// formula divergence (a wrong coefficient would be off by whole units).
	const tolerance = 1e-4

	for _, f := range fixtures {
		t.Run(f.name, func(t *testing.T) {
			// For never-revisited, CalculateWeight derives days_last from
			// days_added*1.5 internally; the SQL CTE does the same. To compare
			// the *score expression* directly we feed SQL the same derived
			// days_last the CTE would (days_added*1.5 when never revisited).
			effectiveDaysLast := f.daysLast
			if f.neverRevisited {
				effectiveDaysLast = f.daysAdded * 1.5
			}

			got := sqlScore(t, f.daysAdded, effectiveDaysLast, f.timesRev)
			want := goScoreFor(f.daysAdded, f.daysLast, f.timesRev, f.neverRevisited)

			if math.Abs(got-want) > tolerance {
				t.Errorf("score mismatch: SQL=%.10f Go=%.10f (diff %.2e)", got, want, math.Abs(got-want))
			}
		})
	}
}

// TestParity_CandidateQueryReturnsOverdueAndFills verifies the end-to-end
// candidate query: every overdue problem is present, and enough non-overdue
// rows are returned to fill problems_per_day. Uses real inserted rows so the
// CTE aggregation (start-of-day revisit state) and ordering are exercised.
func TestParity_CandidateQueryReturnsOverdueAndFills(t *testing.T) {
	setupQueueTestDB(t)

	now := time.Date(2026, 6, 15, 9, 0, 0, 0, time.UTC)
	userID := makeTestUser(t)

	prefs := UserPreferences{
		ProblemsPerDay: 3,
		MinRevisitDays: 2,
		MaxRevisitDays: 10,
	}

	// Insert: 2 clearly-overdue problems (added 40/50 days ago, never revisited
	// -> days_touch >= max 10) and 6 eligible-but-not-overdue (added 5 days
	// ago, never revisited -> days_touch=5, >= min 2, < max 10).
	insertProblem := func(daysAgo float64) uuid.UUID {
		var id uuid.UUID
		added := now.Add(-time.Duration(daysAgo * 24 * float64(time.Hour)))
		err := db.QueryRow(`
			INSERT INTO problems (user_id, title, link, date_added, status)
			VALUES ($1, 'P', 'https://x/p', $2, 'active') RETURNING id`,
			userID, added).Scan(&id)
		if err != nil {
			t.Fatalf("insert problem: %v", err)
		}
		return id
	}

	overdue1 := insertProblem(40)
	overdue2 := insertProblem(50)
	for i := 0; i < 6; i++ {
		insertProblem(5)
	}

	cands, err := loadCandidates(userID, now, prefs)
	if err != nil {
		t.Fatalf("loadCandidates: %v", err)
	}

	// Both overdue problems must be present.
	found := map[uuid.UUID]bool{}
	overdueCount := 0
	for _, c := range cands {
		found[c.Problem.ID] = true
		if c.IsOverdue {
			overdueCount++
		}
	}
	if !found[overdue1] || !found[overdue2] {
		t.Errorf("expected both overdue problems in candidate pool, got %d rows", len(cands))
	}
	if overdueCount < 2 {
		t.Errorf("expected >=2 overdue flagged, got %d", overdueCount)
	}
	// Pool should be capped at problems_per_day * multiplier.
	if len(cands) > prefs.ProblemsPerDay*candidateMultiplier {
		t.Errorf("candidate pool %d exceeds cap %d", len(cands), prefs.ProblemsPerDay*candidateMultiplier)
	}
	// And should have enough to fill problems_per_day.
	if len(cands) < prefs.ProblemsPerDay {
		t.Errorf("expected at least %d candidates to fill the day, got %d", prefs.ProblemsPerDay, len(cands))
	}
}
