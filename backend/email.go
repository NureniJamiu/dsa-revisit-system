package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
)

const resendAPIURL = "https://api.resend.com/emails"

type resendEmailRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	Text    string   `json:"text"`
}

// SendEmail sends the daily reminder via the Resend API
func SendEmail(to string, problems []Problem) error {
	subject := "DSA Reminder: Problem(s) for today"

	var bodyBuilder strings.Builder
	bodyBuilder.WriteString("Hi,\n\nHere's what to revisit today:\n\n")

	for i, p := range problems {
		bodyBuilder.WriteString(fmt.Sprintf("%d. %s - %s\n", i+1, p.Title, p.Link))
	}

	bodyBuilder.WriteString("\nKeep going!\n")

	apiKey := os.Getenv("RESEND_API_KEY")
	emailFrom := os.Getenv("EMAIL_FROM")

	if apiKey == "" {
		// Development mode: Log email
		log.Println("=== EMAIL SIMULATION ===")
		log.Printf("To: %s\n", to)
		log.Printf("Subject: %s\n", subject)
		log.Println(bodyBuilder.String())
		log.Println("========================")
		return nil
	}

	if emailFrom == "" {
		return fmt.Errorf("EMAIL_FROM must be set when RESEND_API_KEY is configured")
	}

	payload, err := json.Marshal(resendEmailRequest{
		From:    emailFrom,
		To:      []string{to},
		Subject: subject,
		Text:    bodyBuilder.String(),
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, resendAPIURL, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("resend API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}
