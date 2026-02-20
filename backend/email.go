package main

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strings"
)

// SendEmail sends the daily reminder using SMTP
func SendEmail(to string, problems []Problem) error {
	subject := "DSA Reminder: Problem(s) for today"

	var bodyBuilder strings.Builder
	bodyBuilder.WriteString("Hi,\n\nHere's what to revisit today:\n\n")

	for i, p := range problems {
		bodyBuilder.WriteString(fmt.Sprintf("%d. %s - %s\n", i+1, p.Title, p.Link))
	}

	bodyBuilder.WriteString("\nKeep going!\n")

	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	emailFrom := os.Getenv("EMAIL_FROM")

	if smtpHost == "" {
		// Development mode: Log email
		log.Println("=== EMAIL SIMULATION ===")
		log.Printf("To: %s\n", to)
		log.Printf("Subject: %s\n", subject)
		log.Println(bodyBuilder.String())
		log.Println("========================")
		return nil
	}

	if emailFrom == "" {
		emailFrom = smtpUser
	}

	// Build RFC 2822 compliant message with proper headers
	msg := []byte("From: " + emailFrom + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/plain; charset=\"utf-8\"\r\n" +
		"\r\n" +
		bodyBuilder.String())

	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, emailFrom, []string{to}, msg)
	if err != nil {
		return err
	}

	return nil
}
