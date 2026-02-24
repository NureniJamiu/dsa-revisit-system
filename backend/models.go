package main

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// NullTime wraps sql.NullTime with proper JSON serialization
// Serializes as ISO string or null, instead of {"Time": "...", "Valid": true}
type NullTime struct {
	sql.NullTime
}

func (nt NullTime) MarshalJSON() ([]byte, error) {
	if !nt.Valid {
		return []byte("null"), nil
	}
	return json.Marshal(nt.Time)
}

func (nt *NullTime) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		nt.Valid = false
		return nil
	}
	var t time.Time
	if err := json.Unmarshal(data, &t); err != nil {
		return err
	}
	nt.Time = t
	nt.Valid = true
	return nil
}

// User represents a registered user
type User struct {
	ID          uuid.UUID       `json:"id"`
	Email       string          `json:"email"`
	Name        string          `json:"name"`
	Preferences UserPreferences `json:"preferences"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// UserPreferences stores user settings
type UserPreferences struct {
	ProblemsPerDay  int    `json:"problems_per_day"`
	MinRevisitDays  int    `json:"min_revisit_days"`
	MaxRevisitDays  int    `json:"max_revisit_days"`
	EmailTime       string `json:"email_time"`
	SkipWeekends    bool   `json:"skip_weekends"`
	AIEncouragement bool   `json:"ai_encouragement"`
}

// Value implements driver.Valuer for JSONB
func (p UserPreferences) Value() (interface{}, error) {
	return json.Marshal(p)
}

// Scan implements sql.Scanner for JSONB
func (p *UserPreferences) Scan(value interface{}) error {
	b, ok := value.([]byte)
	if !ok {
		return nil // or error
	}
	return json.Unmarshal(b, &p)
}

// RevisitEntry represents a single revisit record
type RevisitEntry struct {
	ID          uuid.UUID `json:"id"`
	ProblemID   uuid.UUID `json:"problem_id"`
	RevisitedAt time.Time `json:"revisited_at"`
	Notes       *string   `json:"notes,omitempty"`
}

// Problem represents a DSA problem
type Problem struct {
	ID              uuid.UUID `json:"id"`
	UserID          uuid.UUID `json:"user_id"`
	Title           string    `json:"title"`
	Link            string    `json:"link"`
	DateAdded       time.Time `json:"date_added"`
	LastRevisitedAt NullTime  `json:"last_revisited_at"`
	TimesRevisited  int       `json:"times_revisited"`
	Status          string    `json:"status"` // active, retired
	Topic           string    `json:"topic,omitempty"`
	Difficulty      string    `json:"difficulty,omitempty"`
	Source          string    `json:"source,omitempty"`
	Notes           string    `json:"notes,omitempty"`
}

// ProblemDetail is the response for the problem detail endpoint, includes revisit history
type ProblemDetail struct {
	ID              uuid.UUID      `json:"id"`
	UserID          uuid.UUID      `json:"user_id"`
	Title           string         `json:"title"`
	Link            string         `json:"link"`
	DateAdded       time.Time      `json:"date_added"`
	LastRevisitedAt NullTime       `json:"last_revisited_at"`
	TimesRevisited  int            `json:"times_revisited"`
	Status          string         `json:"status"`
	Topic           string         `json:"topic,omitempty"`
	Difficulty      string         `json:"difficulty,omitempty"`
	Source          string         `json:"source,omitempty"`
	Notes           string         `json:"notes,omitempty"`
	RevisitedToday  bool           `json:"revisited_today"`
	RevisitHistory  []RevisitEntry `json:"revisit_history"`
	WeightInfo      ProblemWeight  `json:"weight_info"`
}
