package main

import (
	"log"
	"time"
)

// defaultTimezone is used whenever a user's stored timezone is empty or not a
// valid IANA name. UTC matches the users.timezone column default.
const defaultTimezone = "UTC"

// loadLocation resolves an IANA timezone name to a *time.Location, falling
// back to UTC on empty or invalid input. Centralized so every caller treats a
// bad/blank timezone the same way (never a hard error) -- a corrupt tz string
// should degrade to UTC scheduling, not crash the dispatcher.
func loadLocation(tz string) *time.Location {
	if tz == "" {
		return time.UTC
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		log.Printf("[Schedule] Invalid timezone %q, falling back to %s: %v", tz, defaultTimezone, err)
		return time.UTC
	}
	return loc
}

// computeNextSendAt returns the next UTC instant at which a user is due for
// their daily email, given the current time, their IANA timezone, their
// preferred send time ("HH:MM", 24h -- same format timeToSend parses), and
// whether they skip weekends.
//
// Semantics, chosen to match existing behavior elsewhere in the codebase:
//   - An empty emailTime means "always ready" (mirrors timeToSend / RunDailyJob),
//     so the next send is simply now.
//   - The reminder time is interpreted in the user's local timezone, then
//     converted back to UTC for storage/comparison against now().
//   - If today's local reminder time has already passed (or is exactly now),
//     roll forward to the next day. This makes the function safe to call both
//     at signup and right after a send: it always returns a strictly-future
//     (or now, for empty emailTime) instant for the *next* occurrence.
//   - When skipWeekends is set, any candidate landing on Saturday or Sunday in
//     the user's local zone rolls forward to the following Monday.
//
// An invalid/blank timezone falls back to UTC via loadLocation.
func computeNextSendAt(now time.Time, tz, emailTime string, skipWeekends bool) time.Time {
	// Empty emailTime == "always ready": due immediately.
	if emailTime == "" {
		return now
	}

	loc := loadLocation(tz)

	parsed, err := time.Parse("15:04", emailTime)
	if err != nil {
		// Malformed time: treat as "always ready" rather than erroring, so a
		// bad preference never wedges a user out of the schedule entirely.
		log.Printf("[Schedule] Invalid emailTime %q, treating as always-ready: %v", emailTime, err)
		return now
	}

	nowLocal := now.In(loc)

	// Candidate: today's reminder time, in the user's local zone.
	candidate := time.Date(
		nowLocal.Year(), nowLocal.Month(), nowLocal.Day(),
		parsed.Hour(), parsed.Minute(), 0, 0, loc,
	)

	// If today's slot is not strictly in the future, move to the next day.
	// Using !After (rather than Before) means "exactly now" also rolls forward,
	// so a send that just fired schedules tomorrow, not another today.
	if !candidate.After(nowLocal) {
		candidate = candidate.AddDate(0, 0, 1)
	}

	if skipWeekends {
		candidate = rollPastWeekend(candidate)
	}

	return candidate.UTC()
}

// rollPastWeekend advances a local-time instant to the following Monday if it
// falls on a Saturday or Sunday, preserving the time-of-day. Evaluated in the
// candidate's own location so "weekend" means the user's local weekend, not
// the server's.
func rollPastWeekend(candidate time.Time) time.Time {
	for candidate.Weekday() == time.Saturday || candidate.Weekday() == time.Sunday {
		candidate = candidate.AddDate(0, 0, 1)
	}
	return candidate
}

// BackfillSchedule sets next_send_at for every user that doesn't already have
// one, computing it from each user's timezone + preferences. Intended as a
// one-time migration step (run via `-job backfill-schedule`) so existing users
// enter the dispatcher's WHERE next_send_at <= now() range after the columns
// from Task 1 are added. Idempotent: users whose next_send_at is already set
// are skipped, so it's safe to re-run.
//
// Returns the number of users updated. Errors on individual rows are logged
// and skipped rather than aborting the whole backfill -- one user with a
// corrupt preferences blob should not block scheduling everyone else.
func BackfillSchedule(now time.Time) (int, error) {
	rows, err := db.Query(`
		SELECT id, timezone, preferences
		FROM users
		WHERE next_send_at IS NULL`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	type pending struct {
		id   string
		next time.Time
	}
	var updates []pending

	for rows.Next() {
		var id, tz string
		var prefs UserPreferences
		if err := rows.Scan(&id, &tz, &prefs); err != nil {
			log.Printf("[Backfill] Error scanning user: %v", err)
			continue
		}
		next := computeNextSendAt(now, tz, prefs.EmailTime, prefs.SkipWeekends)
		updates = append(updates, pending{id: id, next: next})
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}
	// Close the read cursor before issuing writes so we don't hold the read
	// query's resources open across the update loop (matters under the
	// simple-protocol pooler path in db.go).
	rows.Close()

	updated := 0
	for _, u := range updates {
		if _, err := db.Exec(
			`UPDATE users SET next_send_at = $1 WHERE id = $2 AND next_send_at IS NULL`,
			u.next, u.id,
		); err != nil {
			log.Printf("[Backfill] Error updating user %s: %v", u.id, err)
			continue
		}
		updated++
	}

	log.Printf("[Backfill] Set next_send_at for %d user(s)", updated)
	return updated, nil
}
