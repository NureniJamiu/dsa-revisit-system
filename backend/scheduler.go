package main

import (
	"math"
	"math/rand"
	"sort"
	"time"
)

// ProblemWeight holds the computed scheduling metadata for a problem
type ProblemWeight struct {
	ProblemID            string  `json:"problem_id"`
	Weight               float64 `json:"weight"`
	DaysSinceAdded       float64 `json:"days_since_added"`
	DaysSinceLastRevisit float64 `json:"days_since_last_revisit"`
	TimesRevisited       int     `json:"times_revisited"`
	RevisitDecay         float64 `json:"revisit_decay"`
	IsEligible           bool    `json:"is_eligible"`
	Priority             string  `json:"priority"` // "high", "medium", "low"
}

// CalculateWeight determines the probability of a problem being picked.
//
// Philosophy:
//   - Older problems gain priority, but with diminishing returns (sqrt curve).
//   - The longer since last revisit, the more urgent.
//   - Problems with many revisits slowly fade but NEVER disappear.
//   - Recently added problems get a short cooldown so they don't spam immediately.
//   - Minimum weight is always 1.0 — no problem is ever fully silenced.
func CalculateWeight(p Problem) float64 {
	daysSinceAdded := time.Since(p.DateAdded).Hours() / 24

	var daysSinceLastRevisited float64
	if p.LastRevisitedAt.Valid {
		daysSinceLastRevisited = time.Since(p.LastRevisitedAt.Time).Hours() / 24
	} else {
		// Never revisited — give a boost: treat urgency as 1.5x the age
		daysSinceLastRevisited = daysSinceAdded * 1.5
	}

	// 1. Base age factor: sqrt so older problems gain priority with diminishing returns
	ageFactor := math.Sqrt(daysSinceAdded + 1)

	// 2. Urgency factor: linear — the longer since last revisit, the higher
	urgencyFactor := daysSinceLastRevisited

	// 3. Revisit decay: problems slowly fade with revisits but never reach 0
	//    At 0 revisits: 1.0, at 1: 0.77, at 3: 0.53, at 10: 0.25, at 20: 0.14
	revisitDecay := 1.0 / (1.0 + 0.3*float64(p.TimesRevisited))

	// 4. Newness cooldown: problems added in the last 2 days get reduced weight
	//    Day 0: 0.3, Day 1: 0.65, Day 2+: 1.0
	newnessFactor := 1.0
	if daysSinceAdded < 2.0 {
		newnessFactor = 0.3 + (daysSinceAdded / 2.0 * 0.7)
	}

	// Final weight
	weight := (ageFactor + urgencyFactor) * revisitDecay * newnessFactor

	// Minimum floor — no problem is ever fully silenced
	if weight < 1.0 {
		return 1.0
	}
	return weight
}

// CalculateProblemWeight returns detailed scheduling metadata for a problem.
// Used by the API to show users why/when a problem might surface.
func CalculateProblemWeight(p Problem, minRevisitDays int) ProblemWeight {
	daysSinceAdded := time.Since(p.DateAdded).Hours() / 24

	var daysSinceLastRevisited float64
	if p.LastRevisitedAt.Valid {
		daysSinceLastRevisited = time.Since(p.LastRevisitedAt.Time).Hours() / 24
	} else {
		daysSinceLastRevisited = daysSinceAdded * 1.5
	}

	weight := CalculateWeight(p)
	revisitDecay := 1.0 / (1.0 + 0.3*float64(p.TimesRevisited))

	// Determine eligibility based on min revisit days
	isEligible := daysSinceLastRevisited >= float64(minRevisitDays)
	if !p.LastRevisitedAt.Valid {
		isEligible = true // Never revisited = always eligible
	}

	// Priority classification
	priority := "low"
	if weight >= 10.0 {
		priority = "high"
	} else if weight >= 4.0 {
		priority = "medium"
	}

	return ProblemWeight{
		ProblemID:            p.ID.String(),
		Weight:               math.Round(weight*100) / 100,
		DaysSinceAdded:       math.Round(daysSinceAdded*10) / 10,
		DaysSinceLastRevisit: math.Round(daysSinceLastRevisited*10) / 10,
		TimesRevisited:       p.TimesRevisited,
		RevisitDecay:         math.Round(revisitDecay*100) / 100,
		IsEligible:           isEligible,
		Priority:             priority,
	}
}

// SelectProblems picks n problems based on weighted randomness
func SelectProblems(problems []Problem, n int) []Problem {
	return SelectProblemsSeeded(problems, n, time.Now().UnixNano())
}

// SelectProblemsSeeded picks n problems based on weighted randomness using a specific seed.
// Using the same seed with the same input always produces the same selection.
// This is used for "Today's Focus" so the dashboard is stable across page refreshes.
func SelectProblemsSeeded(problems []Problem, n int, seed int64) []Problem {
	if len(problems) <= n {
		return problems
	}

	var selected []Problem
	remaining := make([]Problem, len(problems))
	copy(remaining, problems)

	r := rand.New(rand.NewSource(seed))

	for i := 0; i < n && len(remaining) > 0; i++ {
		totalWeight := 0.0
		for _, p := range remaining {
			totalWeight += CalculateWeight(p)
		}

		if totalWeight == 0 {
			// Fallback: pick random
			idx := r.Intn(len(remaining))
			selected = append(selected, remaining[idx])
			remaining = append(remaining[:idx], remaining[idx+1:]...)
			continue
		}

		value := r.Float64() * totalWeight
		cumulative := 0.0
		for j, p := range remaining {
			cumulative += CalculateWeight(p)
			if cumulative >= value {
				selected = append(selected, p)
				remaining = append(remaining[:j], remaining[j+1:]...)
				break
			}
		}
	}

	return selected
}

// daysSinceRevisit returns how long it's been since a problem was last
// touched: since its last revisit if it has one, otherwise since it was
// added. Used to determine max_revisit_days overdue status.
func daysSinceRevisit(p Problem) float64 {
	if p.LastRevisitedAt.Valid {
		return time.Since(p.LastRevisitedAt.Time).Hours() / 24
	}
	return time.Since(p.DateAdded).Hours() / 24
}

// SelectProblemsWithOverdue behaves like SelectProblemsSeeded, but first
// guarantees a slot to any problem that has gone at least maxRevisitDays
// since it was last touched, regardless of what the weighted draw would have
// done. This is what makes max_revisit_days an actual ceiling: CalculateWeight's
// 1.0 floor makes a problem unlikely to be silenced forever, but never
// guarantees it resurfaces by any specific day, so a problem can in theory go
// arbitrarily long without being picked.
//
// maxRevisitDays <= 0 disables this entirely and falls back to plain
// SelectProblemsSeeded — this matches how an empty EmailTime means "always
// ready" elsewhere in this codebase, and matters in practice because a
// preferences row with max_revisit_days left at its zero value (e.g. a
// partial/legacy settings write) should not suddenly force every problem into
// "overdue" at once.
//
// Guaranteed slots are capped at n (oldest/most-overdue first) so the
// caller's requested count is never exceeded even with a large overdue
// backlog; anything bumped out of the guaranteed set still competes normally
// in the weighted draw that fills the remaining slots.
func SelectProblemsWithOverdue(problems []Problem, n int, seed int64, maxRevisitDays int) []Problem {
	if maxRevisitDays <= 0 || n <= 0 || len(problems) == 0 {
		return SelectProblemsSeeded(problems, n, seed)
	}

	var overdue []Problem
	var rest []Problem
	for _, p := range problems {
		if daysSinceRevisit(p) >= float64(maxRevisitDays) {
			overdue = append(overdue, p)
		} else {
			rest = append(rest, p)
		}
	}

	if len(overdue) == 0 {
		return SelectProblemsSeeded(problems, n, seed)
	}

	// Most overdue first.
	sort.Slice(overdue, func(i, j int) bool {
		return daysSinceRevisit(overdue[i]) > daysSinceRevisit(overdue[j])
	})

	guaranteed := overdue
	if len(guaranteed) > n {
		// Anything bumped out of the guaranteed slots still gets a normal
		// shot in the weighted draw rather than being dropped outright.
		rest = append(rest, guaranteed[n:]...)
		guaranteed = guaranteed[:n]
	}

	remaining := n - len(guaranteed)
	if remaining <= 0 {
		return guaranteed
	}

	drawn := SelectProblemsSeeded(rest, remaining, seed)
	result := make([]Problem, 0, len(guaranteed)+len(drawn))
	result = append(result, guaranteed...)
	result = append(result, drawn...)
	return result
}

// DaySeed returns a deterministic seed for the current calendar day.
// Same date → same seed → same "Today's Focus" selection.
func DaySeed() int64 {
	now := time.Now()
	return int64(now.Year())*10000 + int64(now.Month())*100 + int64(now.Day())
}

