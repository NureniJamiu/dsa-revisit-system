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

// formatPlatformName normalizes platform names nicely for display
func formatPlatformName(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "leetcode":
		return "LeetCode"
	case "neetcode":
		return "NeetCode"
	case "geeksforgeeks", "gfg":
		return "GeeksforGeeks"
	case "hackerrank":
		return "HackerRank"
	case "codeforces":
		return "Codeforces"
	case "algoexpert":
		return "AlgoExpert"
	default:
		if s != "" {
			return strings.TrimSpace(s)
		}
		return "LeetCode"
	}
}

// getPlatformName determines the platform name from Problem.Source or Problem.Link
func getPlatformName(source, link string) string {
	if strings.TrimSpace(source) != "" {
		return formatPlatformName(source)
	}

	lowerLink := strings.ToLower(link)
	switch {
	case strings.Contains(lowerLink, "leetcode"):
		return "LeetCode"
	case strings.Contains(lowerLink, "neetcode"):
		return "NeetCode"
	case strings.Contains(lowerLink, "geeksforgeeks") || strings.Contains(lowerLink, "gfg"):
		return "GeeksforGeeks"
	case strings.Contains(lowerLink, "hackerrank"):
		return "HackerRank"
	case strings.Contains(lowerLink, "codeforces"):
		return "Codeforces"
	case strings.Contains(lowerLink, "algoexpert"):
		return "AlgoExpert"
	default:
		return "LeetCode"
	}
}

// getDisplayTitle extracts a clean, human-readable title if problem title is empty or a URL
func getDisplayTitle(title, link string) string {
	t := strings.TrimSpace(title)
	if t != "" && !strings.HasPrefix(t, "http://") && !strings.HasPrefix(t, "https://") {
		return t
	}

	// Extract title slug from URL
	parts := strings.Split(strings.Trim(link, "/"), "/")
	if len(parts) > 0 {
		slug := parts[len(parts)-1]
		if (slug == "description" || slug == "problem" || slug == "statement") && len(parts) > 1 {
			slug = parts[len(parts)-2]
		}
		words := strings.Split(slug, "-")
		for i, w := range words {
			if len(w) > 0 {
				words[i] = strings.ToUpper(w[:1]) + w[1:]
			}
		}
		res := strings.Join(words, " ")
		if res != "" {
			return res
		}
	}
	return "DSA Problem"
}

// buildHTMLEmail renders a clean, line-separated HTML email matching ReStack's design system.
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
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #0d0e11; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; padding: 32px 28px;">
                    
                    <!-- Header / Branding with SVG Logo -->
                    <tr>
                        <td style="padding-bottom: 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="vertical-align: middle;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" style="display: inline-table; vertical-align: middle;">
                                            <tr>
                                                <td style="vertical-align: middle; padding-right: 10px;">
                                                    <svg viewBox="0 0 100 100" width="28" height="28" style="display: block;">
                                                        <path d="M50 85 L15 70 L50 55 L85 70 Z" fill="#D4B996" />
                                                        <path d="M15 70 L15 75 L50 90 L85 75 L85 70 L50 85 Z" fill="#B0936E" />
                                                        <path d="M50 75 L15 60 L50 45 L85 60 Z" fill="#F3E9DC" />
                                                        <path d="M15 60 L15 65 L50 80 L85 65 L85 60 L50 75 Z" fill="#E2D4C3" />
                                                        <path d="M50 65 L15 50 L50 35 L85 50 Z" fill="#22C55E" />
                                                        <path d="M15 50 L15 55 L50 70 L85 55 L85 50 L50 65 Z" fill="#16A34A" />
                                                        <path d="M50 55 L15 40 L50 25 L85 40 Z" fill="#FEF3E2" />
                                                        <path d="M15 40 L15 45 L50 60 L85 45 L85 40 L50 55 Z" fill="#F9E6CC" />
                                                        <path d="M40 40 L47 47 L60 34" fill="none" stroke="#22C55E" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
                                                    </svg>
                                                </td>
                                                <td style="vertical-align: middle;">
                                                    <span style="font-size: 19px; font-weight: 800; letter-spacing: -0.5px; line-height: 1;"><span style="color: #ffffff;">Re</span><span style="color: #22c55e;">Stack</span></span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td align="right" style="vertical-align: middle; font-size: 13px; color: #9198a1; font-weight: 500;">
                                        Today's Focus
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Title & Subtitle -->
                    <tr>
                        <td style="padding-top: 24px; padding-bottom: 16px;">
                            <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 600; color: #f3f4f6; letter-spacing: -0.4px;">
                                Today's Practice Rotation
                            </h1>
                            <p style="margin: 0; font-size: 14px; color: #9198a1; line-height: 1.5;">
                                Here's what your spaced-repetition schedule surfaced for today. Keep building your streak!
                            </p>
                        </td>
                    </tr>

                    <!-- Problems List with Horizontal Line Separators -->
                    <tr>
                        <td>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">`)

	total := len(problems)
	for i, p := range problems {
		displayTitle := html.EscapeString(getDisplayTitle(p.Title, p.Link))
		escapedLink := html.EscapeString(p.Link)
		platformName := html.EscapeString(getPlatformName(p.Source, p.Link))

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

		borderStyle := "border-bottom: 1px solid rgba(255, 255, 255, 0.08);"
		if i == total-1 {
			borderStyle = ""
		}

		sb.WriteString(`
                                <tr>
                                    <td style="padding-top: 18px; padding-bottom: 18px; ` + borderStyle + `">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding-bottom: 6px;">
                                                    <span style="font-size: 12px; font-weight: 600; color: #62666d; margin-right: 8px;">#` + fmt.Sprintf("%d", i+1) + `</span>`)

		if diffText != "" {
			sb.WriteString(`
                                                    <span style="display: inline-block; font-size: 11px; font-weight: 600; color: ` + diffColor + `; background-color: ` + diffBg + `; border: 1px solid ` + diffBorder + `; padding: 2px 8px; border-radius: 4px; margin-right: 6px;">` + html.EscapeString(diffText) + `</span>`)
		}

		sb.WriteString(`
                                                    <span style="display: inline-block; font-size: 11px; font-weight: 500; color: #9198a1; background-color: rgba(255, 255, 255, 0.06); padding: 2px 8px; border-radius: 4px;">` + platformName + `</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding-bottom: 8px;">
                                                    <a href="` + escapedLink + `" target="_blank" style="font-size: 16px; font-weight: 600; color: #f3f4f6; text-decoration: none; line-height: 1.4;">
                                                        ` + displayTitle + `
                                                    </a>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <a href="` + escapedLink + `" target="_blank" style="font-size: 13px; font-weight: 500; color: #22c55e; text-decoration: none;">
                                                        Solve Problem on ` + platformName + ` &rarr;
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>`)
	}

	sb.WriteString(`
                            </table>
                        </td>
                    </tr>

                    <!-- Primary CTA Button -->
                    <tr>
                        <td align="center" style="padding-top: 28px; padding-bottom: 24px;">
                            <a href="` + html.EscapeString(dashboardURL) + `" target="_blank" style="display: inline-block; background-color: #f4f4f5; color: #18181b; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 32px; border-radius: 9999px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);">
                                View in ReStack
                            </a>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
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
</html>`)

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
		displayTitle := getDisplayTitle(p.Title, p.Link)
		platformName := getPlatformName(p.Source, p.Link)

		diffStr := ""
		if p.Difficulty != "" {
			diffStr = fmt.Sprintf(" [%s]", p.Difficulty)
		}
		bodyBuilder.WriteString(fmt.Sprintf("%d. %s%s - Solve on %s: %s\n", i+1, displayTitle, diffStr, platformName, p.Link))
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
