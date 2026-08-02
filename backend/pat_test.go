package main

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestGeneratePAT(t *testing.T) {
	t.Run("plaintext has the expected prefix", func(t *testing.T) {
		plaintext, _, err := GeneratePAT()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !strings.HasPrefix(plaintext, patPrefix) {
			t.Errorf("expected token to start with %q, got %q", patPrefix, plaintext)
		}
	})

	t.Run("hash matches an independent SHA-256 of the plaintext", func(t *testing.T) {
		plaintext, hash, err := GeneratePAT()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		sum := sha256.Sum256([]byte(plaintext))
		want := hex.EncodeToString(sum[:])
		if hash != want {
			t.Errorf("hash mismatch: got %q, want %q", hash, want)
		}
	})

	t.Run("successive calls produce distinct tokens", func(t *testing.T) {
		a, _, err := GeneratePAT()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		b, _, err := GeneratePAT()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if a == b {
			t.Error("expected two calls to GeneratePAT to produce different tokens")
		}
	})
}

func TestHashPAT(t *testing.T) {
	t.Run("deterministic for the same input", func(t *testing.T) {
		if hashPAT("restack_pat_abc") != hashPAT("restack_pat_abc") {
			t.Error("expected hashPAT to be deterministic")
		}
	})

	t.Run("different inputs produce different hashes", func(t *testing.T) {
		if hashPAT("restack_pat_abc") == hashPAT("restack_pat_xyz") {
			t.Error("expected different inputs to hash differently")
		}
	})
}

func TestLooksLikePAT(t *testing.T) {
	cases := []struct {
		name  string
		token string
		want  bool
	}{
		{"PAT prefix", "restack_pat_abc123", true},
		{"Clerk-style JWT", "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEyMyJ9.sig", false},
		{"empty string", "", false},
		{"prefix substring but not at start", "not_restack_pat_abc", false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := looksLikePAT(tc.token); got != tc.want {
				t.Errorf("looksLikePAT(%q) = %v, want %v", tc.token, got, tc.want)
			}
		})
	}
}

// TestAuthMiddleware_RejectsBeforeReachingHandler exercises the dispatch-level
// rejection paths that don't require a database connection: a missing/malformed
// Authorization header is rejected by AuthMiddleware itself before it decides
// whether to route to ResolvePAT or ClerkAuthMiddleware. This sandbox has no Go
// toolchain to run `go test` against a live Postgres instance, so the
// DB-dependent paths (a valid/invalid/revoked PAT actually resolving via
// ResolvePAT, and a well-formed JWT reaching ClerkAuthMiddleware's JWKS fetch)
// are NOT covered here -- run `go test ./...` locally against a real
// DATABASE_URL to exercise those. See TestClerkAuthMiddleware_RejectsBeforeReachingHandler
// in auth_test.go for the equivalent pattern on the Clerk-only path.
func TestAuthMiddleware_RejectsBeforeReachingHandler(t *testing.T) {
	handler := AuthMiddleware(noopNext(t))

	t.Run("missing Authorization header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/problems", nil)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rec.Code)
		}
	})

	t.Run("Authorization header missing Bearer prefix", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/problems", nil)
		req.Header.Set("Authorization", "Basic sometoken")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rec.Code)
		}
	})

	t.Run("non-PAT malformed token falls through to Clerk path and is rejected", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/problems", nil)
		req.Header.Set("Authorization", "Bearer not-a-jwt-or-pat")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rec.Code)
		}
	})
}
