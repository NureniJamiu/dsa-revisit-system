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
			RunDailyJob(false)
		}
	}()
}

// timeToSend reports whether now is at or after the user's preferred send
// time ("HH:MM", 24h — matches the format stored by the frontend's Settings
// page, not the "HH:MM AM/PM" display format used in the UI). An empty
// emailTime is treated as "always ready".
func timeToSend(now time.Time, emailTime string) (bool, error) {
	preferredTime, err := time.Parse("15:04", emailTime)
	if err != nil {
		return false, err
	}

	currentHour, currentMinute, _ := now.Clock()
	prefHour := preferredTime.Hour()
	prefMin := preferredTime.Minute()

	if currentHour < prefHour || (currentHour == prefHour && currentMinute < prefMin) {
		return false, nil
	}
	return true, nil
}

// RunDailyJob is the main logic for the cron.
// If force is true, it skips the check for last_email_sent_at.
func RunDailyJob(force bool) {
	log.Printf("[Cron] Starting daily job check (force=%v)...", force)

	// 1. Fetch all users
	rows, err := db.Query("SELECT id, email, preferences, last_email_sent_at FROM users")
	if err != nil {
		log.Printf("[Cron] Error fetching users: %v", err)
		return
	}
	defer rows.Close()

	now := time.Now()
	today := now.Format("2006-01-02")

	for rows.Next() {
		var u User
		var lastSent NullTime
		if err := rows.Scan(&u.ID, &u.Email, &u.Preferences, &lastSent); err != nil {
			log.Printf("[Cron] Error scanning user: %v", err)
			continue
		}

		// 1.5. Skip if already sent today (unless forced)
		if !force && lastSent.Valid && lastSent.Time.Format("2006-01-02") == today {
			log.Printf("[Cron] Skipping user %s: Already sent today", u.Email)
			continue
		}

		// 2. Check if it's time to send (e.g. "05:00")
		// If force is true, we bypass this check (useful for Heroku Scheduler / manual trigger)
		if !force && u.Preferences.EmailTime != "" {
			ready, err := timeToSend(now, u.Preferences.EmailTime)
			if err != nil {
				log.Printf("[Cron] Invalid EmailTime for user %s: %s", u.Email, u.Preferences.EmailTime)
				continue
			}
			if !ready {
				log.Printf("[Cron] Skipping user %s: Too early for preferred time %s", u.Email, u.Preferences.EmailTime)
				continue
			}
		}

		log.Printf("[Cron] Processing user %s...", u.Email)

		// 3. Fetch eligible problems
		probRows, err := db.Query(`
			SELECT id, user_id, title, link, date_added, last_revisited_at, times_revisited, status 
			FROM problems 
			WHERE user_id = $1 AND status = 'active'
			ORDER BY date_added ASC`, u.ID)
		if err != nil {
			log.Printf("[Cron] Error fetching problems for user %s: %v", u.ID, err)
			continue
		}

		var eligibleProblems []Problem
		for probRows.Next() {
			var p Problem
			probRows.Scan(&p.ID, &p.UserID, &p.Title, &p.Link, &p.DateAdded, &p.LastRevisitedAt, &p.TimesRevisited, &p.Status)

			daysSinceLast := 9999.0
			if p.LastRevisitedAt.Valid {
				daysSinceLast = time.Since(p.LastRevisitedAt.Time).Hours() / 24
			}

			if daysSinceLast >= float64(u.Preferences.MinRevisitDays) {
				eligibleProblems = append(eligibleProblems, p)
			}
		}
		probRows.Close()

		if len(eligibleProblems) == 0 {
			log.Printf("[Cron] No eligible problems for user %s", u.Email)
			continue
		}

		// 4. Select problems (deterministic per day), guaranteeing overdue ones a slot
		toSend := SelectProblemsWithOverdue(eligibleProblems, u.Preferences.ProblemsPerDay, DaySeed(), u.Preferences.MaxRevisitDays)

		// 5. Send Email
		if len(toSend) > 0 {
			err := SendEmail(u.Email, toSend)
			if err != nil {
				log.Printf("[Cron] Error sending email to %s: %v", u.Email, err)
				continue
			}

			// 6. Mark as sent in DB
			_, err = db.Exec("UPDATE users SET last_email_sent_at = NOW() WHERE id = $1", u.ID)
			if err != nil {
				log.Printf("[Cron] Error updating last_email_sent_at for user %s: %v", u.Email, err)
			}
			log.Printf("[Cron] Successfully sent daily email to %s with %d problems", u.Email, len(toSend))
		}
	}
}
