package main

import (
	"log"
	"time"
)

// StartCron starts the daily job
func StartCron() {
	ticker := time.NewTicker(time.Minute * 1) // Check every minute for MVP/Testing
	defer ticker.Stop()

	go func() {
		for range ticker.C {
			RunDailyJob()
		}
	}()
}

// RunDailyJob is the main logic for the cron
func RunDailyJob() {
	log.Println("Running daily job...")
	
	// 1. Fetch all users
	// For MVP only one user concept really, or mock iteration
	rows, err := db.Query("SELECT id, email, preferences FROM users")
	if err != nil {
		log.Printf("Error fetching users: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.Preferences); err != nil {
			log.Printf("Error scanning user: %v", err)
			continue
		}

		// Check if it's time to send email based on u.Preferences.EmailTime
		// For MVP/Demo: Just send it if we haven't sent it today (need tracking)
		// Or just send it every time the job runs for testing purposes
		
		// Fetch eligible problems
		// Filter by min_revisit_days
		probRows, err := db.Query(`
			SELECT id, user_id, title, link, date_added, last_revisited_at, times_revisited, status 
			FROM problems 
			WHERE user_id = $1 AND status = 'active'`, u.ID)
		if err != nil {
			log.Printf("Error fetching problems for user %s: %v", u.ID, err)
			continue
		}
		
		var eligibleProblems []Problem
		var allProblems []Problem 

		for probRows.Next() {
			var p Problem
			probRows.Scan(&p.ID, &p.UserID, &p.Title, &p.Link, &p.DateAdded, &p.LastRevisitedAt, &p.TimesRevisited, &p.Status)
			
			// Check eligibility (min revisit days)
			daysSinceLast := 9999.0
			if p.LastRevisitedAt.Valid {
				daysSinceLast = time.Since(p.LastRevisitedAt.Time).Hours() / 24
			}
			
			if daysSinceLast >= float64(u.Preferences.MinRevisitDays) {
				eligibleProblems = append(eligibleProblems, p)
			}
			allProblems = append(allProblems, p)
		}
		probRows.Close()

		if len(eligibleProblems) == 0 {
			log.Printf("No eligible problems for user %s", u.Email)
			continue
		}

		// Select problems
		toSend := SelectProblems(eligibleProblems, u.Preferences.ProblemsPerDay)

		// Send Email
		if len(toSend) > 0 {
			err := SendEmail(u.Email, toSend)
			if err != nil {
				log.Printf("Error sending email to %s: %v", u.Email, err)
			}
		}
	}
}
