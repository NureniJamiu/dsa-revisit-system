package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html"
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
	Text    string   `json:"text,omitempty"`
	HTML    string   `json:"html,omitempty"`
}

// buildHTMLEmail renders a clean, responsive HTML email matching ReStack's design system.
func buildHTMLEmail(problems []Problem, dashboardURL string) string {
	var sb strings.Builder

	sb.WriteString(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DSA Reminder: Problem(s) for today</title>
</head>
<body style="margin: 0; padding: 0; background-color: #08090a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #08090a; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #0d0e11; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; padding: 32px 24px;">
                    
                    <!-- Header / Branding -->
                    <tr>
                        <td style="padding-bottom: 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <span style="display: inline-block; width: 10px; height: 10px; background-color: #22c55e; border-radius: 50%; margin-right: 8px; vertical-align: middle;"></span>
                                        <span style="font-weight: 700; font-size: 16px; letter-spacing: -0.3px; color: #f3f4f6; vertical-align: middle;">ReStack</span>
                                    </td>
                                    <td align="right" style="font-size: 12px; color: #62666d; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                                        Daily Focus Set
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Title & Subtitle -->
                    <tr>
                        <td style="padding-top: 24px; padding-bottom: 20px;">
                            <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 600; color: #f3f4f6; letter-spacing: -0.4px;">
                                Today's Practice Rotation
                            </h1>
                            <p style="margin: 0; font-size: 14px; color: #9198a1; line-height: 1.5;">
                                Here's what your spaced-repetition schedule surfaced for today. Keep building your streak!
                            </p>
                        </td>
                    </tr>

                    <!-- Problems List -->
                    <tr>
                        <td>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">`)

	for i, p := range problems {
		escapedTitle := html.EscapeString(p.Title)
		escapedLink := html.EscapeString(p.Link)

		// Difficulty badge styling
		diffText := p.Difficulty
		diffColor := "#9198a1"
		diffBg := "rgba(255, 255, 255, 0.06)"
		diffBorder := "rgba(255, 255, 255, 0.1)"

		switch strings.ToLower(p.Difficulty) {
		case "easy":
			diffColor = "#4ade80"
			diffBg = "rgba(34, 197, 94, 0.12)"
			diffBorder = "rgba(34, 197, 94, 0.3)"
		case "medium":
			diffColor = "#fbbf24"
			diffBg = "rgba(245, 158, 11, 0.12)"
			diffBorder = "rgba(245, 158, 11, 0.3)"
		case "hard":
			diffColor = "#f87171"
			diffBg = "rgba(239, 68, 68, 0.12)"
			diffBorder = "rgba(239, 68, 68, 0.3)"
		}

		sourceTag := p.Source
		if sourceTag == "" {
			sourceTag = "Problem"
		}

		sb.WriteString(fmt.Sprintf(`
                                <tr>
                                    <td style="padding-bottom: 12px;">
                                        <div style="background-color: #131418; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 16px;">
                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td>
                                                        <span style="font-size: 12px; font-weight: 600; color: #62666d; margin-right: 8px;">#%d</span>`, i+1))

		if diffText != "" {
			sb.WriteString(fmt.Sprintf(`
                                                        <span style="display: inline-block; font-size: 11px; font-weight: 600; color: %s; background-color: %s; border: 1px solid %s; padding: 2px 8px; border-radius: 4px; margin-right: 6px;">%s</span>`, diffColor, diffBg, diffBorder, html.EscapeString(diffText)))
		}

		sb.WriteString(fmt.Sprintf(`
                                                        <span style="display: inline-block; font-size: 11px; font-weight: 500; color: #9198a1; background-color: rgba(255, 255, 255, 0.06); padding: 2px 8px; border-radius: 4px;">%s</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding-top: 8px; padding-bottom: 10px;">
                                                        <a href="%s" target="_blank" style="font-size: 15px; font-weight: 600; color: #f3f4f6; text-decoration: none; line-height: 1.4;">
                                                            %s
                                                        </a>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <a href="%s" target="_blank" style="font-size: 13px; font-weight: 500; color: #22c55e; text-decoration: none;">
                                                            Solve Problem &rarr;
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>
                                    </td>
                                </tr>`, escapedLink, escapedTitle, escapedLink))
	}

	sb.WriteString(fmt.Sprintf(`
                            </table>
                        </td>
                    </tr>

                    <!-- Primary CTA Button -->
                    <tr>
                        <td align="center" style="padding-top: 24px; padding-bottom: 24px;">
                            <a href="%s" target="_blank" style="display: inline-block; background-color: #f4f4f5; color: #18181b; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 32px; border-radius: 9999px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);">
                                View in ReStack
                            </a>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #62666d; line-height: 1.5;">
                                Sent with care by <strong style="color: #9198a1;">ReStack</strong> &bull; Your Spaced-Repetition Tracker<br>
                                You received this because daily notifications are enabled in your preferences.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`, dashboardURL))

	return sb.String()
}

// SendEmail sends the daily reminder via the Resend API
func SendEmail(to string, problems []Problem) error {
	subject := "DSA Reminder: Problem(s) for today"

	appURL := strings.TrimRight(os.Getenv("APP_URL"), "/")
	if appURL == "" {
		appURL = "https://re-stack.vercel.app"
	}
	dashboardURL := fmt.Sprintf("%s/?from=email", appURL)

	// Build plain text version for fallback
	var bodyBuilder strings.Builder
	bodyBuilder.WriteString("Hi,\n\nHere's what to revisit today:\n\n")

	for i, p := range problems {
		diffStr := ""
		if p.Difficulty != "" {
			diffStr = fmt.Sprintf(" [%s]", p.Difficulty)
		}
		bodyBuilder.WriteString(fmt.Sprintf("%d. %s%s - %s\n", i+1, p.Title, diffStr, p.Link))
	}

	bodyBuilder.WriteString(fmt.Sprintf("\nView in ReStack: %s\n\nKeep going!\n", dashboardURL))

	// Build HTML version using design system
	htmlBody := buildHTMLEmail(problems, dashboardURL)

	apiKey := os.Getenv("RESEND_API_KEY")
	emailFrom := os.Getenv("EMAIL_FROM")

	if apiKey == "" {
		// Development mode: Log email
		log.Println("=== EMAIL SIMULATION ===")
		log.Printf("To: %s\n", to)
		log.Printf("Subject: %s\n", subject)
		log.Println("--- Text Body ---")
		log.Println(bodyBuilder.String())
		log.Println("--- HTML Body ---")
		log.Println(htmlBody)
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
		HTML:    htmlBody,
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
