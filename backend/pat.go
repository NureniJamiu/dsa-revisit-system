package main

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"log"
	"strings"

	"github.com/google/uuid"
)

// patPrefix marks a token as a personal access token rather than a Clerk
// JWT, so AuthMiddleware (auth.go) can dispatch on it cheaply without
// touching the DB or JWKS. Modeled on recognizable-prefix conventions like
// GitHub's "ghp_" or Stripe's "sk_" -- if a token leaks, the prefix alone
// tells you what it is.
const patPrefix = "restack_pat_"

// patRandomBytes is the amount of entropy in a generated token, before
// base64url encoding. 32 bytes (256 bits) matches what crypto/rand is
// typically used for and is far more than needed to resist guessing.
const patRandomBytes = 32

// GeneratePAT creates a new random token and its SHA-256 hash. The plaintext
// is what gets shown to the user (once); the hash is what gets stored.
func GeneratePAT() (plaintext string, hash string, err error) {
	buf := make([]byte, patRandomBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", "", fmt.Errorf("failed to generate random token: %w", err)
	}
	plaintext = patPrefix + base64.RawURLEncoding.EncodeToString(buf)
	hash = hashPAT(plaintext)
	return plaintext, hash, nil
}

// hashPAT hashes a token's full plaintext string (including its prefix) with
// SHA-256, hex-encoded. Only the hash is ever persisted.
func hashPAT(plaintext string) string {
	sum := sha256.Sum256([]byte(plaintext))
	return hex.EncodeToString(sum[:])
}

// looksLikePAT reports whether a bearer token is a personal access token
// (as opposed to a Clerk JWT), based on its prefix.
func looksLikePAT(tokenStr string) bool {
	return strings.HasPrefix(tokenStr, patPrefix)
}

// CreatePAT generates and stores a new token for userID, returning the
// plaintext exactly once. label defaults to "Chrome extension" if empty (the
// column default), matching CreateToken's handler-level default.
func CreatePAT(userID uuid.UUID, label string) (plaintext string, id uuid.UUID, err error) {
	plaintext, hash, err := GeneratePAT()
	if err != nil {
		return "", uuid.Nil, err
	}

	if label == "" {
		err = db.QueryRow(
			`INSERT INTO personal_access_tokens (user_id, token_hash) VALUES ($1, $2) RETURNING id`,
			userID, hash,
		).Scan(&id)
	} else {
		err = db.QueryRow(
			`INSERT INTO personal_access_tokens (user_id, token_hash, label) VALUES ($1, $2, $3) RETURNING id`,
			userID, hash, label,
		).Scan(&id)
	}
	if err != nil {
		return "", uuid.Nil, fmt.Errorf("failed to store personal access token: %w", err)
	}

	return plaintext, id, nil
}

// ResolvePAT looks up the user a plaintext token belongs to. Returns an
// error if the token is unknown or has been revoked. Updates last_used_at
// best-effort -- a failure to record that shouldn't fail the request that's
// already been authenticated.
func ResolvePAT(tokenStr string) (uuid.UUID, error) {
	hash := hashPAT(tokenStr)

	var userID uuid.UUID
	err := db.QueryRow(
		`SELECT user_id FROM personal_access_tokens WHERE token_hash = $1 AND revoked_at IS NULL`,
		hash,
	).Scan(&userID)
	if err == sql.ErrNoRows {
		return uuid.Nil, fmt.Errorf("token not found or revoked")
	}
	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to resolve token: %w", err)
	}

	if _, updateErr := db.Exec(
		`UPDATE personal_access_tokens SET last_used_at = NOW() WHERE token_hash = $1`, hash,
	); updateErr != nil {
		log.Printf("Warning: failed to update last_used_at for a PAT: %v", updateErr)
	}

	return userID, nil
}

// ListPATs returns every token belonging to userID (including revoked ones,
// so the settings page can show history), newest first. Never includes the
// hash.
func ListPATs(userID uuid.UUID) ([]PATSummary, error) {
	rows, err := db.Query(
		`SELECT id, label, created_at, last_used_at, revoked_at
		 FROM personal_access_tokens
		 WHERE user_id = $1
		 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list personal access tokens: %w", err)
	}
	defer rows.Close()

	tokens := []PATSummary{}
	for rows.Next() {
		var t PATSummary
		if err := rows.Scan(&t.ID, &t.Label, &t.CreatedAt, &t.LastUsedAt, &t.RevokedAt); err != nil {
			return nil, fmt.Errorf("failed to scan personal access token: %w", err)
		}
		tokens = append(tokens, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return tokens, nil
}

// RevokePAT soft-deletes a token by setting revoked_at, scoped to userID so
// one user can never revoke another user's token by guessing an ID. Returns
// sql.ErrNoRows if the token doesn't exist, isn't owned by userID, or is
// already revoked.
func RevokePAT(userID, tokenID uuid.UUID) error {
	res, err := db.Exec(
		`UPDATE personal_access_tokens
		 SET revoked_at = NOW()
		 WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
		tokenID, userID,
	)
	if err != nil {
		return fmt.Errorf("failed to revoke personal access token: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}
