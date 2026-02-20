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
			// Already sent today, skip
			continue
		}

		// 2. Check if it's time to send (e.g. "05:00")
		// If EmailTime is empty, we default to sending as soon as we can once a day
		if u.Preferences.EmailTime != "" {
			preferredTime, err := time.Parse("15:04", u.Preferences.EmailTime)
			if err != nil {
				log.Printf("[Cron] Invalid EmailTime for user %s: %s", u.Email, u.Preferences.EmailTime)
				// Continue anyway or skip? Let's skip and log error
				continue
			}

			// Current hour and minute
			currentHour, currentMinute, _ := now.Clock()
			prefHour := preferredTime.Hour()
			prefMin := preferredTime.Minute()

			// Only send if current time is at or after preferred time
			if currentHour < prefHour || (currentHour == prefHour && currentMinute < prefMin) {
				// Too early for this user
				continue
			}
		}

		log.Printf("[Cron] Processing user %s...", u.Email)

		// 3. Fetch eligible problems
		probRows, err := db.Query(`
			SELECT id, user_id, title, link, date_added, last_revisited_at, times_revisited, status 
			FROM problems 
			WHERE user_id = $1 AND status = 'active'`, u.ID)
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
			// Still mark as "checked/sent" for today so we don't spam them with checks
			// if they have no problems? No, if they add a problem later today,
			// they might want the email. But usually emails are daily.
			// For now, let's only mark SENT if we actually send something.
			continue
		}

		// 4. Select problems
		toSend := SelectProblems(eligibleProblems, u.Preferences.ProblemsPerDay)

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
