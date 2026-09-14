package main

import (
	"testing"
	"time"
)

// TestUpdateSettings_PersistsTimezoneAndRecomputesSchedule exercises the
// timezone round-trip and the next_send_at recompute directly against the DB
// (calling the same UPDATE the handler runs), so the settings write and the
// schedule stay consistent.
func TestUpdateSettings_PersistsTimezoneAndRecomputesSchedule(t *testing.T) {
	setupQueueTestDB(t)

	userID := makeTestUser(t)

	prefs := UserPreferences{
		ProblemsPerDay: 3,
		MinRevisitDays: 2,
		MaxRevisitDays: 10,
		EmailTime:      "06:00",
		SkipWeekends:   false,
	}
	tz := "America/New_York"
	next := computeNextSendAt(time.Now(), tz, prefs.EmailTime, prefs.SkipWeekends)

	if _, err := db.Exec(
		`UPDATE users SET preferences = $1, timezone = $2, next_send_at = $3 WHERE id = $4`,
		prefs, tz, next, userID,
	); err != nil {
		t.Fatalf("update: %v", err)
	}

	var gotTZ string
	var gotNext NullTime
	var gotPrefs UserPreferences
	if err := db.QueryRow(
		`SELECT COALESCE(timezone,'UTC'), next_send_at, preferences FROM users WHERE id = $1`, userID,
	).Scan(&gotTZ, &gotNext, &gotPrefs); err != nil {
		t.Fatalf("read back: %v", err)
	}

	if gotTZ != tz {
		t.Errorf("timezone: want %s, got %s", tz, gotTZ)
	}
	if gotPrefs.EmailTime != "06:00" {
		t.Errorf("email_time: want 06:00, got %s", gotPrefs.EmailTime)
	}
	if !gotNext.Valid {
		t.Fatal("next_send_at should be set")
	}
	// The stored next_send_at should be 06:00 in New_York (10:00 or 11:00 UTC
	// depending on DST); assert the local hour is 6.
	loc, _ := time.LoadLocation(tz)
	if h := gotNext.Time.In(loc).Hour(); h != 6 {
		t.Errorf("next_send_at local hour: want 6, got %d (%v)", h, gotNext.Time)
	}
}

// TestValidateTimezone covers the validation the handler applies before
// persisting a timezone.
func TestValidateTimezone(t *testing.T) {
	cases := []struct {
		tz      string
		wantErr bool
	}{
		{"", false},
		{"UTC", false},
		{"America/New_York", false},
		{"Europe/London", false},
		{"Not/AZone", true},
		{"random junk", true},
	}
	for _, c := range cases {
		err := validateTimezone(c.tz)
		if (err != nil) != c.wantErr {
			t.Errorf("validateTimezone(%q): wantErr=%v got %v", c.tz, c.wantErr, err)
		}
	}
}
