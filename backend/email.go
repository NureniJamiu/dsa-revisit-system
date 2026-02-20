package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
)

// SendEmail sends the daily reminder using Resend API
func SendEmail(to string, problems []Problem) error {
	subject := "DSA Reminder: Problem(s) for today"

	var bodyBuilder strings.Builder
	bodyBuilder.WriteString("Hi,\n\nHere's what to revisit today:\n\n")

	for i, p := range problems {
		bodyBuilder.WriteString(fmt.Sprintf("%d. %s - %s\n", i+1, p.Title, p.Link))
	}

	bodyBuilder.WriteString("\nKeep going!\n")

	apiKey := os.Getenv("RESEND_API_KEY")
	fromEmail := os.Getenv("EMAIL_FROM")

	if apiKey == "" {
		// Development mode: Log email
		log.Println("=== EMAIL SIMULATION ===")
		log.Printf("To: %s\n", to)
		log.Printf("From: %s\n", fromEmail)
		log.Printf("Subject: %s\n", subject)
		log.Println(bodyBuilder.String())
		log.Println("========================")
		return nil
	}

	if fromEmail == "" {
		fromEmail = "onboarding@resend.dev"
	}

	// Resend API Request Structure
	requestBody, err := json.Marshal(map[string]interface{}{
		"from":    fromEmail,
		"to":      []string{to},
		"subject": subject,
		"text":    bodyBuilder.String(),
	})
	if err != nil {
		return fmt.Errorf("failed to marshal email request: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(requestBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		var errData map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errData)
		return fmt.Errorf("resend api error (status %d): %v", resp.StatusCode, errData)
	}

	return nil
}
