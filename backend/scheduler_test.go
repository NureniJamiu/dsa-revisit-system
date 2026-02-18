package main

import (
	"database/sql"
	"testing"
	"time"
)

// helper to build a Problem with a specific age and revisit history
func makeProblem(daysAgo float64, lastRevisitDaysAgo float64, timesRevisited int) Problem {
	now := time.Now()
	p := Problem{
		DateAdded:      now.Add(-time.Duration(daysAgo*24) * time.Hour),
		TimesRevisited: timesRevisited,
		Status:         "active",
	}
	if lastRevisitDaysAgo >= 0 {
		p.LastRevisitedAt = NullTime{sql.NullTime{
			Time:  now.Add(-time.Duration(lastRevisitDaysAgo*24) * time.Hour),
			Valid: true,
		}}
	}
	// lastRevisitDaysAgo < 0 means never revisited (NullTime zero value, Valid=false)
	return p
}

// ── CalculateWeight tests ─────────────────────────────────────────────

func TestCalculateWeight_MinimumFloor(t *testing.T) {
	// A brand-new problem (0 days old, never revisited) has a newness cooldown
	// of 0.3, but the minimum floor should keep it at 1.0.
	p := makeProblem(0, -1, 0)
	w := CalculateWeight(p)
	if w < 1.0 {
		t.Errorf("weight should never be below 1.0, got %f", w)
	}
}

func TestCalculateWeight_NewnessCooldown(t *testing.T) {
	// A problem added 1 day ago should have a lower weight than one added 10 days ago
	// (both never revisited, same revisit count).
	young := makeProblem(1, -1, 0)
	old := makeProblem(10, -1, 0)

	wYoung := CalculateWeight(young)
	wOld := CalculateWeight(old)

	if wYoung >= wOld {
		t.Errorf("young problem weight (%f) should be less than old problem weight (%f)", wYoung, wOld)
	}
}

func TestCalculateWeight_RevisitDecay(t *testing.T) {
	// A problem revisited 20 times should have a lower weight than one revisited 0 times,
	// all else being equal.
	few := makeProblem(30, 5, 0)
	many := makeProblem(30, 5, 20)

	wFew := CalculateWeight(few)
	wMany := CalculateWeight(many)

	if wMany >= wFew {
		t.Errorf("heavily revisited weight (%f) should be less than lightly revisited weight (%f)", wMany, wFew)
	}
}

func TestCalculateWeight_UrgencyBoost(t *testing.T) {
	// A problem last revisited 30 days ago should have a higher weight than one revisited 1 day ago.
	recent := makeProblem(60, 1, 3)
	stale := makeProblem(60, 30, 3)

	wRecent := CalculateWeight(recent)
	wStale := CalculateWeight(stale)

	if wStale <= wRecent {
		t.Errorf("stale problem weight (%f) should be greater than recently revisited weight (%f)", wStale, wRecent)
	}
}

func TestCalculateWeight_NeverFullySilenced(t *testing.T) {
	// Even with 100 revisits, weight should be >= 1.0.
	p := makeProblem(5, 1, 100)
	w := CalculateWeight(p)
	if w < 1.0 {
		t.Errorf("weight should never be below 1.0 even with many revisits, got %f", w)
	}
}

// ── CalculateProblemWeight (metadata) tests ───────────────────────────

func TestCalculateProblemWeight_PriorityHigh(t *testing.T) {
	// Old problem, never revisited → high urgency → high weight (>= 10).
	p := makeProblem(100, -1, 0)
	pw := CalculateProblemWeight(p, 2)
	if pw.Priority != "high" {
		t.Errorf("expected priority=high, got %s (weight=%.2f)", pw.Priority, pw.Weight)
	}
}

func TestCalculateProblemWeight_PriorityLow(t *testing.T) {
	// Young problem with many revisits → low weight.
	p := makeProblem(3, 1, 10)
	pw := CalculateProblemWeight(p, 2)
	if pw.Priority != "low" {
		t.Errorf("expected priority=low, got %s (weight=%.2f)", pw.Priority, pw.Weight)
	}
}

func TestCalculateProblemWeight_EligibilityRespected(t *testing.T) {
	// Problem revisited 1 day ago with minRevisitDays=3 → not eligible.
	p := makeProblem(10, 1, 2)
	pw := CalculateProblemWeight(p, 3)
	if pw.IsEligible {
		t.Errorf("expected not eligible (1 day since revisit, min=3), but got eligible")
	}

	// Same problem but last revisited 5 days ago → eligible.
	p2 := makeProblem(10, 5, 2)
	pw2 := CalculateProblemWeight(p2, 3)
	if !pw2.IsEligible {
		t.Errorf("expected eligible (5 days since revisit, min=3), but got not eligible")
	}
}

func TestCalculateProblemWeight_NeverRevisitedAlwaysEligible(t *testing.T) {
	p := makeProblem(5, -1, 0)
	pw := CalculateProblemWeight(p, 10) // even with high min, never-revisited = eligible
	if !pw.IsEligible {
		t.Errorf("never revisited problem should always be eligible")
	}
}

// ── SelectProblems tests ──────────────────────────────────────────────

func TestSelectProblemsSeeded_Deterministic(t *testing.T) {
	problems := []Problem{
		makeProblem(10, -1, 0),
		makeProblem(20, 5, 1),
		makeProblem(30, 10, 2),
		makeProblem(40, 15, 3),
		makeProblem(50, 20, 4),
	}

	seed := int64(20260218)
	sel1 := SelectProblemsSeeded(problems, 2, seed)
	sel2 := SelectProblemsSeeded(problems, 2, seed)

	if len(sel1) != len(sel2) {
		t.Fatalf("same seed should produce same count: %d vs %d", len(sel1), len(sel2))
	}
	for i := range sel1 {
		if sel1[i].DateAdded != sel2[i].DateAdded {
			t.Errorf("same seed should produce same selection at index %d", i)
		}
	}
}

func TestSelectProblems_ReturnsAllIfFewerThanN(t *testing.T) {
	problems := []Problem{
		makeProblem(10, -1, 0),
		makeProblem(20, 5, 1),
	}

	selected := SelectProblems(problems, 5)
	if len(selected) != 2 {
		t.Errorf("should return all problems when fewer than n, got %d", len(selected))
	}
}

func TestSelectProblems_ReturnsExactN(t *testing.T) {
	problems := []Problem{
		makeProblem(10, -1, 0),
		makeProblem(20, 5, 1),
		makeProblem(30, 10, 2),
		makeProblem(40, 15, 3),
		makeProblem(50, 20, 4),
	}

	selected := SelectProblems(problems, 3)
	if len(selected) != 3 {
		t.Errorf("should return exactly 3 problems, got %d", len(selected))
	}
}
