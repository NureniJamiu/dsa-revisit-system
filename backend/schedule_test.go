package main

import (
	"testing"
	"time"
)

func mustLoad(t *testing.T, name string) *time.Location {
	t.Helper()
	loc, err := time.LoadLocation(name)
	if err != nil {
		t.Fatalf("could not load location %q: %v", name, err)
	}
	return loc
}

func TestComputeNextSendAt(t *testing.T) {
	ny := mustLoad(t, "America/New_York")

	t.Run("empty emailTime is always-ready (returns now)", func(t *testing.T) {
		now := time.Date(2026, 3, 2, 15, 4, 0, 0, time.UTC)
		got := computeNextSendAt(now, "America/New_York", "", false)
		if !got.Equal(now) {
			t.Errorf("expected now (%v), got %v", now, got)
		}
	})

	t.Run("later today in user zone stays today", func(t *testing.T) {
		// 10:00 UTC == 05:00 America/New_York (EST, UTC-5). Reminder 06:00 local
		// is still ahead, so it should schedule for 06:00 EST today == 11:00 UTC.
		now := time.Date(2026, 1, 5, 10, 0, 0, 0, time.UTC) // Monday
		got := computeNextSendAt(now, "America/New_York", "06:00", false)
		want := time.Date(2026, 1, 5, 6, 0, 0, 0, ny).UTC()
		if !got.Equal(want) {
			t.Errorf("want %v, got %v", want, got)
		}
	})

	t.Run("already past today rolls to tomorrow", func(t *testing.T) {
		// 15:00 UTC == 10:00 EST. Reminder 06:00 local already passed, so next
		// is 06:00 EST the following day.
		now := time.Date(2026, 1, 5, 15, 0, 0, 0, time.UTC) // Monday
		got := computeNextSendAt(now, "America/New_York", "06:00", false)
		want := time.Date(2026, 1, 6, 6, 0, 0, 0, ny).UTC()
		if !got.Equal(want) {
			t.Errorf("want %v, got %v", want, got)
		}
	})

	t.Run("exactly at reminder time rolls to tomorrow", func(t *testing.T) {
		// now == 06:00 EST exactly. !After(now) means it should NOT fire again
		// today; it rolls to tomorrow so a just-fired send doesn't reschedule
		// for the same day.
		now := time.Date(2026, 1, 5, 6, 0, 0, 0, ny).UTC() // Monday 06:00 EST
		got := computeNextSendAt(now, "America/New_York", "06:00", false)
		want := time.Date(2026, 1, 6, 6, 0, 0, 0, ny).UTC()
		if !got.Equal(want) {
			t.Errorf("want %v, got %v", want, got)
		}
	})

	t.Run("skip weekends rolls Saturday to Monday", func(t *testing.T) {
		// Friday after the reminder time -> next candidate is Saturday, which
		// with skipWeekends should roll to Monday.
		now := time.Date(2026, 1, 9, 15, 0, 0, 0, time.UTC) // Friday, 10:00 EST
		got := computeNextSendAt(now, "America/New_York", "06:00", true)
		want := time.Date(2026, 1, 12, 6, 0, 0, 0, ny).UTC() // Monday
		if !got.Equal(want) {
			t.Errorf("want Monday %v, got %v", want, got)
		}
		if got.In(ny).Weekday() != time.Monday {
			t.Errorf("expected Monday in local zone, got %v", got.In(ny).Weekday())
		}
	})

	t.Run("skip weekends rolls Sunday to Monday", func(t *testing.T) {
		// Saturday -> next candidate Sunday -> should roll to Monday.
		now := time.Date(2026, 1, 10, 15, 0, 0, 0, time.UTC) // Saturday
		got := computeNextSendAt(now, "America/New_York", "06:00", true)
		if got.In(ny).Weekday() != time.Monday {
			t.Errorf("expected Monday, got %v (%v)", got.In(ny).Weekday(), got)
		}
	})

	t.Run("weekend allowed when skipWeekends is false", func(t *testing.T) {
		now := time.Date(2026, 1, 9, 15, 0, 0, 0, time.UTC) // Friday, past reminder
		got := computeNextSendAt(now, "America/New_York", "06:00", false)
		if got.In(ny).Weekday() != time.Saturday {
			t.Errorf("expected Saturday allowed, got %v (%v)", got.In(ny).Weekday(), got)
		}
	})

	t.Run("invalid timezone falls back to UTC", func(t *testing.T) {
		now := time.Date(2026, 1, 5, 3, 0, 0, 0, time.UTC) // before 06:00 UTC
		got := computeNextSendAt(now, "Not/AZone", "06:00", false)
		want := time.Date(2026, 1, 5, 6, 0, 0, 0, time.UTC)
		if !got.Equal(want) {
			t.Errorf("want UTC %v, got %v", want, got)
		}
	})

	t.Run("blank timezone falls back to UTC", func(t *testing.T) {
		now := time.Date(2026, 1, 5, 3, 0, 0, 0, time.UTC)
		got := computeNextSendAt(now, "", "06:00", false)
		want := time.Date(2026, 1, 5, 6, 0, 0, 0, time.UTC)
		if !got.Equal(want) {
			t.Errorf("want UTC %v, got %v", want, got)
		}
	})

	t.Run("malformed emailTime is treated as always-ready", func(t *testing.T) {
		now := time.Date(2026, 1, 5, 3, 0, 0, 0, time.UTC)
		got := computeNextSendAt(now, "UTC", "6am", false)
		if !got.Equal(now) {
			t.Errorf("expected now for malformed emailTime, got %v", got)
		}
	})

	// DST correctness: crossing the US spring-forward boundary. On 2026-03-08
	// America/New_York jumps from EST (UTC-5) to EDT (UTC-4) at 02:00 local.
	// A 06:00 local reminder the day before is UTC-5 (11:00 UTC); the day of
	// and after the transition it is UTC-4 (10:00 UTC). The function must track
	// the wall-clock 06:00, not a fixed UTC offset.
	t.Run("DST spring forward keeps local wall-clock time", func(t *testing.T) {
		// Saturday 2026-03-07, past reminder -> next is Sunday 03-08 (DST day).
		now := time.Date(2026, 3, 7, 15, 0, 0, 0, time.UTC)
		got := computeNextSendAt(now, "America/New_York", "06:00", false)
		want := time.Date(2026, 3, 8, 6, 0, 0, 0, ny).UTC() // 10:00 UTC (EDT)
		if !got.Equal(want) {
			t.Errorf("want %v (10:00 UTC EDT), got %v", want, got)
		}
		if got.In(ny).Hour() != 6 {
			t.Errorf("expected local hour 6, got %d", got.In(ny).Hour())
		}
	})

	t.Run("DST fall back keeps local wall-clock time", func(t *testing.T) {
		// 2026-11-01 fall-back day (EDT->EST at 02:00). A day-before-past-reminder
		// call should land 06:00 local on the transition day.
		now := time.Date(2026, 10, 31, 15, 0, 0, 0, time.UTC) // Saturday
		got := computeNextSendAt(now, "America/New_York", "06:00", false)
		if got.In(ny).Hour() != 6 || got.In(ny).Minute() != 0 {
			t.Errorf("expected 06:00 local, got %02d:%02d (%v)", got.In(ny).Hour(), got.In(ny).Minute(), got)
		}
	})
}
