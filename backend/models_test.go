package main

import (
	"encoding/json"
	"testing"
	"time"
)

func TestNullTime_MarshalJSON(t *testing.T) {
	t.Run("marshals invalid as null", func(t *testing.T) {
		var nt NullTime
		b, err := nt.MarshalJSON()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if string(b) != "null" {
			t.Errorf("expected null, got %s", b)
		}
	})

	t.Run("marshals valid as ISO string", func(t *testing.T) {
		tm := time.Date(2026, 7, 31, 5, 0, 0, 0, time.UTC)
		nt := NullTime{}
		nt.Valid = true
		nt.Time = tm

		b, err := nt.MarshalJSON()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		expected, _ := json.Marshal(tm)
		if string(b) != string(expected) {
			t.Errorf("expected %s, got %s", expected, b)
		}
	})
}

func TestNullTime_UnmarshalJSON(t *testing.T) {
	t.Run("null becomes invalid", func(t *testing.T) {
		var nt NullTime
		if err := nt.UnmarshalJSON([]byte("null")); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if nt.Valid {
			t.Error("expected Valid=false for null input")
		}
	})

	t.Run("ISO string becomes valid time", func(t *testing.T) {
		var nt NullTime
		if err := nt.UnmarshalJSON([]byte(`"2026-07-31T05:00:00Z"`)); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !nt.Valid {
			t.Fatal("expected Valid=true")
		}
		if !nt.Time.Equal(time.Date(2026, 7, 31, 5, 0, 0, 0, time.UTC)) {
			t.Errorf("unexpected time: %v", nt.Time)
		}
	})
}

func TestUserPreferences_ValueAndScan(t *testing.T) {
	original := UserPreferences{
		ProblemsPerDay:  3,
		MinRevisitDays:  2,
		MaxRevisitDays:  10,
		EmailTime:       "05:00",
		SkipWeekends:    false,
		AIEncouragement: true,
	}

	v, err := original.Value()
	if err != nil {
		t.Fatalf("Value() error: %v", err)
	}

	t.Run("scans from []byte (typical pgx/lib/pq driver value)", func(t *testing.T) {
		b, ok := v.([]byte)
		if !ok {
			t.Fatalf("expected []byte from Value(), got %T", v)
		}
		var scanned UserPreferences
		if err := scanned.Scan(b); err != nil {
			t.Fatalf("Scan() error: %v", err)
		}
		if scanned != original {
			t.Errorf("expected %+v, got %+v", original, scanned)
		}
	})

	t.Run("scans from string", func(t *testing.T) {
		b, _ := v.([]byte)
		var scanned UserPreferences
		if err := scanned.Scan(string(b)); err != nil {
			t.Fatalf("Scan() error: %v", err)
		}
		if scanned != original {
			t.Errorf("expected %+v, got %+v", original, scanned)
		}
	})

	t.Run("nil value scans as no-op, not an error", func(t *testing.T) {
		var scanned UserPreferences
		if err := scanned.Scan(nil); err != nil {
			t.Fatalf("expected nil error for nil value, got %v", err)
		}
	})

	t.Run("unsupported type returns an error instead of silently zeroing", func(t *testing.T) {
		var scanned UserPreferences
		err := scanned.Scan(12345)
		if err == nil {
			t.Fatal("expected an error for unsupported type, got nil")
		}
	})
}
