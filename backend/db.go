package main

import (
	"database/sql"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	_ "github.com/jackc/pgx/v5/stdlib"
)

var db *sql.DB

func InitDB() {
	var err error
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	db, err = sql.Open("pgx", connStr)
	if err != nil {
		log.Fatalf("Unable to opening database driver: %v\n", err)
	}

	// Retry ping with backoff — Postgres may still be starting
	for attempt := 1; attempt <= 10; attempt++ {
		if err = db.Ping(); err == nil {
			break
		}
		log.Printf("Waiting for database (attempt %d/10): %v", attempt, err)
		time.Sleep(time.Duration(attempt) * 500 * time.Millisecond)
	}
	if err != nil {
		log.Fatalf("Unable to ping database after retries: %v\n", err)
	}

	log.Println("Successfully connected to the database")

	// Run migrations
	runMigrations()
}

// runMigrations applies the clerk_id column migration idempotently.
func runMigrations() {
	_, err := db.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id VARCHAR(255) UNIQUE`)
	if err != nil {
		log.Printf("Migration warning (clerk_id column): %v", err)
	} else {
		log.Println("Migration: clerk_id column ensured")
	}

	_, err = db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id)`)
	if err != nil {
		log.Printf("Migration warning (clerk_id index): %v", err)
	}
}

// FindOrCreateUserByClerkID looks up a user by their Clerk ID.
// If the user doesn't exist, it auto-provisions a new row and returns the internal UUID.
// If an email is provided and differs from the stored one, it syncs the email.
func FindOrCreateUserByClerkID(clerkID string, email string) (uuid.UUID, error) {
	var userID uuid.UUID
	var storedEmail string

	// Try to find existing user
	err := db.QueryRow(`SELECT id, email FROM users WHERE clerk_id = $1`, clerkID).Scan(&userID, &storedEmail)
	if err == nil {
		// Sync email if Clerk provides a real one and it differs from what's stored
		if email != "" && email != storedEmail {
			_, updateErr := db.Exec(`UPDATE users SET email = $1 WHERE id = $2`, email, userID)
			if updateErr != nil {
				log.Printf("Warning: failed to sync email for user %s: %v", userID, updateErr)
			} else {
				log.Printf("Synced email for user %s: %s -> %s", userID, storedEmail, email)
			}
		}
		return userID, nil
	}
	if err != sql.ErrNoRows {
		return uuid.Nil, err
	}

	// Determine which email to use for provisioning
	provisionEmail := email
	if provisionEmail == "" {
		provisionEmail = clerkID + "@clerk.placeholder"
	}

	// Auto-provision: create a new user with the Clerk ID
	err = db.QueryRow(`
		INSERT INTO users (clerk_id, email, name, preferences)
		VALUES ($1, $2, $3, $4)
		RETURNING id`,
		clerkID,
		provisionEmail,
		"DSA Learner",
		`{"problems_per_day": 3, "min_revisit_days": 2, "max_revisit_days": 10, "email_time": "05:00", "skip_weekends": false, "ai_encouragement": true}`,
	).Scan(&userID)
	if err != nil {
		// Could be a race condition — try to find again
		err2 := db.QueryRow(`SELECT id FROM users WHERE clerk_id = $1`, clerkID).Scan(&userID)
		if err2 == nil {
			return userID, nil
		}
		return uuid.Nil, err
	}

	log.Printf("Auto-provisioned new user: clerk_id=%s, email=%s, internal_id=%s", clerkID, provisionEmail, userID)
	return userID, nil
}
