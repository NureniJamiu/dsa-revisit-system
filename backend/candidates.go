package main

import (
	"time"

	"github.com/google/uuid"
)

// candidateScoreSQL is the SQL translation of scheduler.go's CalculateWeight.
// It MUST stay in lockstep with that Go function -- parity_test.go runs the
// same fixtures through both and fails if they diverge. Kept as a shared
// constant (not inlined) so the candidate query and the parity test score the
// exact same expression.
//
// Inputs it expects in scope (from the surrounding query):
//   - days_added   = days since date_added        (>= 0)
//   - days_last    = days since last revisit, or days_added * 1.5 when the
//     problem has never been revisited (mirrors CalculateWeight's
//     "never revisited" urgency boost)
//   - times_rev    = times_revisited
//
// Formula, matching CalculateWeight exactly:
//
//	ageFactor     = sqrt(days_added + 1)
//	urgencyFactor = days_last
//	revisitDecay  = 1 / (1 + 0.3 * times_rev)
//	newnessFactor = days_added < 2 ? 0.3 + (days_added/2)*0.7 : 1.0
//	weight        = (ageFactor + urgencyFactor) * revisitDecay * newnessFactor
//	result        = GREATEST(weight, 1.0)   -- the "never fully silenced" floor
const candidateScoreSQL = `
GREATEST(
    (sqrt(days_added + 1) + days_last)
    * (1.0 / (1.0 + 0.3 * times_rev))
    * (CASE WHEN days_added < 2.0 THEN 0.3 + (days_added / 2.0) * 0.7 ELSE 1.0 END),
    1.0
)`

// candidateQuery returns a small, scored candidate pool for a user instead of
// every active problem. Postgres does the pruning (eligibility + scoring +
// LIMIT); Go then runs the stateful final pick (topic balancing + overdue
// guarantee + day-seed determinism) over this handful of rows.
//
// Semantics deliberately mirror the existing GetTodaysFocus path:
//   - "start of day" state: revisits from CURRENT_DATE (in `now`'s frame) are
//     excluded from times_revisited / last_revisited so the day's selection is
//     stable (matches GetTodaysFocus's prev_* aggregation).
//   - eligibility: days_since_last >= min_revisit_days, OR never revisited.
//   - is_overdue: days_since_touch >= max_revisit_days (when max > 0), where
//     "touch" falls back to date_added when never revisited -- same as
//     scheduler.go's daysSinceRevisit.
//   - only problems added before today are considered (date_added::date < today),
//     matching GetTodaysFocus.
//
// The LIMIT is (problems_per_day * candidateMultiplier) but every overdue row
// is force-included via the ordering (is_overdue first), so the Go overdue
// guarantee always has its full input. `now` is passed explicitly so the query
// is deterministic and testable (parity test pins it) rather than depending on
// server clock inside SQL.
const candidateMultiplier = 3

func candidateQuery() string {
	// $1 user_id, $2 now (timestamptz), $3 min_revisit_days,
	// $4 max_revisit_days, $5 limit
	return `
WITH scored AS (
    SELECT
        p.id, p.user_id, p.title, p.link, p.date_added, p.status,
        COALESCE(p.difficulty, '') AS difficulty,
        COALESCE(p.source, 'LeetCode') AS source,
        COALESCE(p.notes, '') AS notes,
        rev.prev_times AS times_rev,
        rev.prev_last AS last_revisited_at,
        EXTRACT(EPOCH FROM ($2::timestamptz - p.date_added)) / 86400.0 AS days_added,
        CASE
            WHEN rev.prev_last IS NULL
                THEN (EXTRACT(EPOCH FROM ($2::timestamptz - p.date_added)) / 86400.0) * 1.5
            ELSE EXTRACT(EPOCH FROM ($2::timestamptz - rev.prev_last)) / 86400.0
        END AS days_last,
        CASE
            WHEN rev.prev_last IS NULL
                THEN EXTRACT(EPOCH FROM ($2::timestamptz - p.date_added)) / 86400.0
            ELSE EXTRACT(EPOCH FROM ($2::timestamptz - rev.prev_last)) / 86400.0
        END AS days_touch
    FROM problems p
    LEFT JOIN LATERAL (
        SELECT
            COUNT(*) FILTER (WHERE rh.revisited_at < date_trunc('day', $2::timestamptz)) AS prev_times,
            MAX(rh.revisited_at) FILTER (WHERE rh.revisited_at < date_trunc('day', $2::timestamptz)) AS prev_last
        FROM revisit_history rh
        WHERE rh.problem_id = p.id
    ) rev ON TRUE
    WHERE p.user_id = $1
      AND p.status = 'active'
      AND p.date_added < date_trunc('day', $2::timestamptz)
)
SELECT
    id, user_id, title, link, date_added, status,
    difficulty, source, notes,
    times_rev, last_revisited_at,
    ` + candidateScoreSQL + ` AS base_score,
    (CASE WHEN $4 > 0 AND days_touch >= $4 THEN TRUE ELSE FALSE END) AS is_overdue
FROM scored
WHERE
    -- eligibility: never revisited OR past the min cadence
    (last_revisited_at IS NULL OR days_last >= $3)
-- Overdue rows first, and among overdue the MOST overdue first, so that if the
-- LIMIT truncates the pool it keeps the rows the Go overdue guarantee would
-- pick (SelectProblemsWithOverdue takes most-overdue-first). Non-overdue rows
-- are then ordered by score so the weighted draw gets the strongest candidates.
ORDER BY is_overdue DESC, (CASE WHEN $4 > 0 AND days_touch >= $4 THEN days_touch ELSE NULL END) DESC NULLS LAST, base_score DESC
LIMIT $5`
}

// scoredCandidate is one row from candidateQuery: the problem plus its
// SQL-computed score and overdue flag.
type scoredCandidate struct {
	Problem   Problem
	BaseScore float64
	IsOverdue bool
}

// loadCandidates runs candidateQuery for a user and returns the scored pool.
// The caller then runs SelectProblemsWithOverdue over Candidates() to produce
// the final selection. Topics are NOT attached here -- the caller attaches
// them on just the returned handful (attachTopics), keeping this query lean.
func loadCandidates(userID uuid.UUID, now time.Time, prefs UserPreferences) ([]scoredCandidate, error) {
	limit := prefs.ProblemsPerDay * candidateMultiplier
	if limit < prefs.ProblemsPerDay {
		limit = prefs.ProblemsPerDay
	}
	if limit <= 0 {
		limit = 1
	}

	rows, err := db.Query(candidateQuery(),
		userID, now, prefs.MinRevisitDays, prefs.MaxRevisitDays, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []scoredCandidate
	for rows.Next() {
		var c scoredCandidate
		if err := rows.Scan(
			&c.Problem.ID, &c.Problem.UserID, &c.Problem.Title, &c.Problem.Link,
			&c.Problem.DateAdded, &c.Problem.Status,
			&c.Problem.Difficulty, &c.Problem.Source, &c.Problem.Notes,
			&c.Problem.TimesRevisited, &c.Problem.LastRevisitedAt,
			&c.BaseScore, &c.IsOverdue,
		); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// candidateProblems extracts just the Problem values from a scored candidate
// pool, in order, for handing to SelectProblemsWithOverdue.
func candidateProblems(cands []scoredCandidate) []Problem {
	problems := make([]Problem, len(cands))
	for i, c := range cands {
		problems[i] = c.Problem
	}
	return problems
}
