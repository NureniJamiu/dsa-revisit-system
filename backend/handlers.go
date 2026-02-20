package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// Helper for JSON responses
func respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	response, err := json.Marshal(payload)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Error marshaling response"))
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(response)
}

// GetProblems returns list of problems for the authenticated user
func GetProblems(w http.ResponseWriter, r *http.Request) {
	userID := GetUserIDFromContext(r)

	rows, err := db.Query(`
		SELECT id, user_id, title, link, date_added, last_revisited_at, 
		       times_revisited, status, COALESCE(topic, ''), COALESCE(difficulty, ''), COALESCE(source, 'LeetCode')
		FROM problems
		WHERE user_id = $1
		ORDER BY date_added DESC`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	problems := []Problem{}
	for rows.Next() {
		var p Problem
		if err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Link, &p.DateAdded,
			&p.LastRevisitedAt, &p.TimesRevisited, &p.Status,
			&p.Topic, &p.Difficulty, &p.Source); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		problems = append(problems, p)
	}

	respondJSON(w, http.StatusOK, problems)
}

// GetProblemByID returns a single problem's details including revisit history and weight
func GetProblemByID(w http.ResponseWriter, r *http.Request) {
	userID := GetUserIDFromContext(r)
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var p ProblemDetail
	err = db.QueryRow(`
		SELECT id, user_id, title, link, date_added, last_revisited_at, 
		       times_revisited, status, COALESCE(topic, ''), COALESCE(difficulty, ''), COALESCE(source, 'LeetCode')
		FROM problems 
		WHERE id = $1 AND user_id = $2`, id, userID).Scan(
		&p.ID, &p.UserID, &p.Title, &p.Link, &p.DateAdded,
		&p.LastRevisitedAt, &p.TimesRevisited, &p.Status,
		&p.Topic, &p.Difficulty, &p.Source)

	if err != nil {
		http.Error(w, "Problem not found", http.StatusNotFound)
		return
	}

	// Check if already revisited today
	var todayCount int
	err = db.QueryRow(`
		SELECT COUNT(*) FROM revisit_history
		WHERE problem_id = $1 AND revisited_at::date = CURRENT_DATE`, id).Scan(&todayCount)
	if err != nil {
		todayCount = 0
	}
	p.RevisitedToday = todayCount > 0

	// Calculate weight/scheduling info
	problemForWeight := Problem{
		ID:              p.ID,
		UserID:          p.UserID,
		Title:           p.Title,
		Link:            p.Link,
		DateAdded:       p.DateAdded,
		LastRevisitedAt: p.LastRevisitedAt,
		TimesRevisited:  p.TimesRevisited,
		Status:          p.Status,
	}
	// Use default min revisit days (2) for MVP; can be user-specific later
	p.WeightInfo = CalculateProblemWeight(problemForWeight, 2)

	// Fetch revisit history for this problem (newest first)
	historyRows, err := db.Query(`
		SELECT id, problem_id, revisited_at, notes
		FROM revisit_history
		WHERE problem_id = $1
		ORDER BY revisited_at DESC`, id)
	if err != nil {
		// Log error but still return the problem without history
		p.RevisitHistory = []RevisitEntry{}
	} else {
		defer historyRows.Close()
		entries := []RevisitEntry{}
		for historyRows.Next() {
			var entry RevisitEntry
			if err := historyRows.Scan(&entry.ID, &entry.ProblemID, &entry.RevisitedAt, &entry.Notes); err != nil {
				continue
			}
			entries = append(entries, entry)
		}
		p.RevisitHistory = entries
	}

	// Ensure revisit_history is never null in JSON
	if p.RevisitHistory == nil {
		p.RevisitHistory = []RevisitEntry{}
	}

	respondJSON(w, http.StatusOK, p)
}

// CreateProblem adds a new problem for the authenticated user
func CreateProblem(w http.ResponseWriter, r *http.Request) {
	userID := GetUserIDFromContext(r)

	var p Problem
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Always use the authenticated user's ID
	p.UserID = userID

	// Default source
	if p.Source == "" {
		p.Source = "LeetCode"
	}

	sqlStatement := `
		INSERT INTO problems (user_id, title, link, status, times_revisited, date_added, difficulty, source)
		VALUES ($1, $2, $3, 'active', 0, NOW(), $4, $5)
		RETURNING id, date_added, status`

	err := db.QueryRow(sqlStatement, p.UserID, p.Title, p.Link, p.Difficulty, p.Source).Scan(&p.ID, &p.DateAdded, &p.Status)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusCreated, p)
}

// MarkRevisited records a revisit and increments the counter
func MarkRevisited(w http.ResponseWriter, r *http.Request) {
	userID := GetUserIDFromContext(r)
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	// Verify ownership
	var ownerID uuid.UUID
	err = db.QueryRow(`SELECT user_id FROM problems WHERE id = $1`, id).Scan(&ownerID)
	if err != nil {
		http.Error(w, "Problem not found", http.StatusNotFound)
		return
	}
	if ownerID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Parse optional notes from request body
	var body struct {
		Notes string `json:"notes"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	// Guard: check if already revisited today
	var todayCount int
	err = db.QueryRow(`
		SELECT COUNT(*) FROM revisit_history
		WHERE problem_id = $1 AND revisited_at::date = CURRENT_DATE`, id).Scan(&todayCount)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if todayCount > 0 {
		respondJSON(w, http.StatusConflict, map[string]string{
			"error":   "already_revisited_today",
			"message": "This problem has already been revisited today. Come back tomorrow!",
		})
		return
	}

	// Start a transaction to ensure both operations succeed
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// 1. Insert a revisit history entry
	var notes *string
	if body.Notes != "" {
		notes = &body.Notes
	}
	_, err = tx.Exec(`
		INSERT INTO revisit_history (problem_id, revisited_at, notes)
		VALUES ($1, NOW(), $2)`, id, notes)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 2. Update the problem's aggregate counters
	_, err = tx.Exec(`
		UPDATE problems 
		SET times_revisited = times_revisited + 1, last_revisited_at = NOW()
		WHERE id = $1`, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "revisited"})
}

// ArchiveProblem retires a problem
func ArchiveProblem(w http.ResponseWriter, r *http.Request) {
	userID := GetUserIDFromContext(r)
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	result, err := db.Exec(`
		UPDATE problems 
		SET status = 'retired'
		WHERE id = $1 AND user_id = $2`, id, userID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Problem not found", http.StatusNotFound)
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "retired"})
}

// UpdateProblem updates problem details
func UpdateProblem(w http.ResponseWriter, r *http.Request) {
	userID := GetUserIDFromContext(r)
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var p Problem
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	result, err := db.Exec(`
		UPDATE problems 
		SET title = $1, link = $2, difficulty = $3, source = $4
		WHERE id = $5 AND user_id = $6`,
		p.Title, p.Link, p.Difficulty, p.Source, id, userID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Problem not found", http.StatusNotFound)
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// DeleteProblem permanently removes a problem and its history
func DeleteProblem(w http.ResponseWriter, r *http.Request) {
	userID := GetUserIDFromContext(r)
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	// Start a transaction to delete history and problem
	tx, err := db.Begin()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// 1. Delete history
	_, err = tx.Exec(`DELETE FROM revisit_history WHERE problem_id = $1`, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 2. Delete problem (with ownership check)
	result, err := tx.Exec(`DELETE FROM problems WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		http.Error(w, "Problem not found", http.StatusNotFound)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// GetProblemWeight returns the scheduling weight for a single problem
func GetProblemWeight(w http.ResponseWriter, r *http.Request) {
	userID := GetUserIDFromContext(r)
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var p Problem
	err = db.QueryRow(`
		SELECT id, user_id, title, link, date_added, last_revisited_at, 
		       times_revisited, status, COALESCE(topic, ''), COALESCE(difficulty, ''), COALESCE(source, 'LeetCode')
		FROM problems 
		WHERE id = $1 AND user_id = $2`, id, userID).Scan(
		&p.ID, &p.UserID, &p.Title, &p.Link, &p.DateAdded,
		&p.LastRevisitedAt, &p.TimesRevisited, &p.Status,
		&p.Topic, &p.Difficulty, &p.Source)

	if err != nil {
		http.Error(w, "Problem not found", http.StatusNotFound)
		return
	}

	weight := CalculateProblemWeight(p, 2) // default min_revisit_days = 2
	respondJSON(w, http.StatusOK, weight)
}

// GetAllWeights returns all active problems with their scheduling weights
func GetAllWeights(w http.ResponseWriter, r *http.Request) {
	userID := GetUserIDFromContext(r)

	rows, err := db.Query(`
		SELECT id, user_id, title, link, date_added, last_revisited_at, 
		       times_revisited, status, COALESCE(topic, ''), COALESCE(difficulty, ''), COALESCE(source, 'LeetCode')
		FROM problems
		WHERE status = 'active' AND user_id = $1
		ORDER BY date_added DESC`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type ProblemWithWeight struct {
		Problem Problem       `json:"problem"`
		Weight  ProblemWeight `json:"weight"`
	}

	var results []ProblemWithWeight
	for rows.Next() {
		var p Problem
		if err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Link, &p.DateAdded,
			&p.LastRevisitedAt, &p.TimesRevisited, &p.Status,
			&p.Topic, &p.Difficulty, &p.Source); err != nil {
			continue
		}
		weight := CalculateProblemWeight(p, 2)
		results = append(results, ProblemWithWeight{Problem: p, Weight: weight})
	}

	// Sort by weight descending (highest priority first)
	sort.Slice(results, func(i, j int) bool {
		return results[i].Weight.Weight > results[j].Weight.Weight
	})

	if results == nil {
		results = []ProblemWithWeight{}
	}

	respondJSON(w, http.StatusOK, results)
}

// GetTodaysFocus returns today's recommended problems using weighted selection.
// The selection is deterministic per day — refreshing the page shows the same problems.
// Uses DaySeed() so tomorrow picks different ones.
func GetTodaysFocus(w http.ResponseWriter, r *http.Request) {
	userID := GetUserIDFromContext(r)
	const defaultMinRevisitDays = 2
	const defaultProblemsPerDay = 3

	// 1. Fetch all active problems for this user
	rows, err := db.Query(`
		SELECT id, user_id, title, link, date_added, last_revisited_at, 
		       times_revisited, status, COALESCE(topic, ''), COALESCE(difficulty, ''), COALESCE(source, 'LeetCode')
		FROM problems
		WHERE status = 'active' AND user_id = $1
		ORDER BY date_added ASC`, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var allProblems []Problem
	for rows.Next() {
		var p Problem
		if err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Link, &p.DateAdded,
			&p.LastRevisitedAt, &p.TimesRevisited, &p.Status,
			&p.Topic, &p.Difficulty, &p.Source); err != nil {
			continue
		}
		allProblems = append(allProblems, p)
	}

	// 2. Filter for eligibility (min revisit days)
	var eligible []Problem
	for _, p := range allProblems {
		daysSinceLast := 9999.0
		if p.LastRevisitedAt.Valid {
			daysSinceLast = time.Since(p.LastRevisitedAt.Time).Hours() / 24
		}
		if daysSinceLast >= float64(defaultMinRevisitDays) {
			eligible = append(eligible, p)
		}
	}

	// 3. Select today's focus using day-deterministic seed
	focusCount := defaultProblemsPerDay
	if len(eligible) < focusCount {
		focusCount = len(eligible)
	}
	selected := SelectProblemsSeeded(eligible, focusCount, DaySeed())

	// 4. Check which of today's focus problems have been revisited today
	type TodaysFocusItem struct {
		Problem        Problem       `json:"problem"`
		Weight         ProblemWeight `json:"weight"`
		RevisitedToday bool          `json:"revisited_today"`
	}

	var items []TodaysFocusItem
	completedCount := 0

	for _, p := range selected {
		weight := CalculateProblemWeight(p, defaultMinRevisitDays)

		// Check if revisited today
		var todayCount int
		err := db.QueryRow(`
			SELECT COUNT(*) FROM revisit_history
			WHERE problem_id = $1 AND revisited_at::date = CURRENT_DATE`, p.ID).Scan(&todayCount)
		if err != nil {
			todayCount = 0
		}

		revisitedToday := todayCount > 0
		if revisitedToday {
			completedCount++
		}

		items = append(items, TodaysFocusItem{
			Problem:        p,
			Weight:         weight,
			RevisitedToday: revisitedToday,
		})
	}

	if items == nil {
		items = []TodaysFocusItem{}
	}

	// 5. Return with summary
	response := struct {
		Problems []TodaysFocusItem `json:"problems"`
		Summary  struct {
			TotalFocus int `json:"total_focus"`
			Completed  int `json:"completed"`
			Remaining  int `json:"remaining"`
		} `json:"summary"`
	}{
		Problems: items,
	}
	response.Summary.TotalFocus = len(items)
	response.Summary.Completed = completedCount
	response.Summary.Remaining = len(items) - completedCount

	respondJSON(w, http.StatusOK, response)
}

// GetSettings fetches user preferences
func GetSettings(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"message": "Settings endpoint"})
}

// UpdateSettings updates user preferences
func UpdateSettings(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"message": "Settings updated"})
}

// TestEmail triggers the full email pipeline on-demand for the authenticated user.
// Returns a JSON report with the problems that were selected, their weights,
// and whether the email was successfully sent (or simulated).
func TestEmail(w http.ResponseWriter, r *http.Request) {
	userID := GetUserIDFromContext(r)

	// 1. Fetch user
	var u User
	err := db.QueryRow("SELECT id, email, preferences FROM users WHERE id = $1", userID).Scan(
		&u.ID, &u.Email, &u.Preferences)
	if err != nil {
		respondJSON(w, http.StatusNotFound, map[string]string{
			"error": "User not found. Ensure your Clerk account has been provisioned.",
		})
		return
	}

	// 2. Fetch all active problems
	rows, err := db.Query(`
		SELECT id, user_id, title, link, date_added, last_revisited_at,
		       times_revisited, status, COALESCE(topic, ''), COALESCE(difficulty, ''), COALESCE(source, 'LeetCode')
		FROM problems
		WHERE user_id = $1 AND status = 'active'`, userID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	type ProblemWeightDetail struct {
		Title    string        `json:"title"`
		Link     string        `json:"link"`
		Weight   ProblemWeight `json:"weight"`
		Selected bool          `json:"selected"`
	}

	var allDetails []ProblemWeightDetail
	var eligible []Problem
	var allProblems []Problem

	for rows.Next() {
		var p Problem
		if err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Link, &p.DateAdded,
			&p.LastRevisitedAt, &p.TimesRevisited, &p.Status,
			&p.Topic, &p.Difficulty, &p.Source); err != nil {
			continue
		}
		allProblems = append(allProblems, p)

		daysSinceLast := 9999.0
		if p.LastRevisitedAt.Valid {
			daysSinceLast = time.Since(p.LastRevisitedAt.Time).Hours() / 24
		}

		pw := CalculateProblemWeight(p, u.Preferences.MinRevisitDays)
		detail := ProblemWeightDetail{
			Title:  p.Title,
			Link:   p.Link,
			Weight: pw,
		}
		allDetails = append(allDetails, detail)

		if daysSinceLast >= float64(u.Preferences.MinRevisitDays) {
			eligible = append(eligible, p)
		}
	}

	// 3. Select problems using weighted random
	toSend := SelectProblems(eligible, u.Preferences.ProblemsPerDay)

	// Mark selected in the details list
	selectedSet := make(map[string]bool)
	for _, p := range toSend {
		selectedSet[p.ID.String()] = true
	}
	for i := range allDetails {
		if selectedSet[allDetails[i].Weight.ProblemID] {
			allDetails[i].Selected = true
		}
	}

	// 4. Send email
	emailStatus := "no_problems_to_send"
	var emailErr string
	if len(toSend) > 0 {
		err := SendEmail(u.Email, toSend)
		if err != nil {
			emailStatus = "error"
			emailErr = err.Error()
		} else {
			emailStatus = "sent"
		}
	}

	// 5. Build response
	response := struct {
		Status         string                `json:"status"`
		EmailStatus    string                `json:"email_status"`
		EmailError     string                `json:"email_error,omitempty"`
		RecipientEmail string                `json:"recipient_email"`
		TotalProblems  int                   `json:"total_problems"`
		EligibleCount  int                   `json:"eligible_count"`
		SelectedCount  int                   `json:"selected_count"`
		ProblemsPerDay int                   `json:"problems_per_day"`
		MinRevisitDays int                   `json:"min_revisit_days"`
		AllProblems    []ProblemWeightDetail `json:"all_problems"`
	}{
		Status:         "ok",
		EmailStatus:    emailStatus,
		EmailError:     emailErr,
		RecipientEmail: u.Email,
		TotalProblems:  len(allProblems),
		EligibleCount:  len(eligible),
		SelectedCount:  len(toSend),
		ProblemsPerDay: u.Preferences.ProblemsPerDay,
		MinRevisitDays: u.Preferences.MinRevisitDays,
		AllProblems:    allDetails,
	}

	if response.AllProblems == nil {
		response.AllProblems = []ProblemWeightDetail{}
	}

	respondJSON(w, http.StatusOK, response)
}

// RunCronAllUsers manually triggers the daily cron job for ALL users.
// This skips the EmailTime check logic? No, current RunDailyJob has EmailTime check inside.
// To make it truly manual trigger, we should probably have a way to force it.
// For now, it just calls RunDailyJob() and returns a summary.
func RunCronAllUsers(w http.ResponseWriter, r *http.Request) {
	log.Println("[Admin] Manually triggering daily job for all users...")
	RunDailyJob(true)
	respondJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"message": "Daily job triggered. Check server logs for detailed progress.",
	})
}
