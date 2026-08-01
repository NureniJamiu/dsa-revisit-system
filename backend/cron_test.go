package main

import (
	"testing"
	"time"
)

func TestTimeToSend(t *testing.T) {
	t.Run("returns false before preferred time", func(t *testing.T) {
		now := time.Date(2026, 7, 31, 4, 59, 0, 0, time.UTC)
		ready, err := timeToSend(now, "05:00")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if ready {
			t.Error("expected not ready before preferred time")
		}
	})

	t.Run("returns true at preferred time", func(t *testing.T) {
		now := time.Date(2026, 7, 31, 5, 0, 0, 0, time.UTC)
		ready, err := timeToSend(now, "05:00")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !ready {
			t.Error("expected ready at preferred time")
		}
	})

	t.Run("returns true after preferred time", func(t *testing.T) {
		now := time.Date(2026, 7, 31, 23, 0, 0, 0, time.UTC)
		ready, err := timeToSend(now, "05:00")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !ready {
			t.Error("expected ready after preferred time")
		}
	})

	t.Run("compares minutes within the same hour", func(t *testing.T) {
		now := time.Date(2026, 7, 31, 5, 29, 0, 0, time.UTC)
		ready, err := timeToSend(now, "05:30")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if ready {
			t.Error("expected not ready one minute before preferred time")
		}
	})

	t.Run("errors on malformed emailTime instead of silently allowing", func(t *testing.T) {
		now := time.Date(2026, 7, 31, 12, 0, 0, 0, time.UTC)
		_, err := timeToSend(now, "05:00 AM")
		if err == nil {
			t.Error("expected an error for 12-hour formatted input, got nil")
		}
	})
}
