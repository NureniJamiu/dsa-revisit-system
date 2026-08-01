package main

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"math/big"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/golang-jwt/jwt/v5"
)

func TestRequireAdminSecret(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := RequireAdminSecret(next)

	t.Run("fails closed when ADMIN_SECRET is unset", func(t *testing.T) {
		os.Unsetenv("ADMIN_SECRET")

		req := httptest.NewRequest(http.MethodPost, "/api/admin/run-cron", nil)
		req.Header.Set("X-Admin-Secret", "anything")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusServiceUnavailable {
			t.Errorf("expected 503, got %d", rec.Code)
		}
	})

	t.Run("rejects missing header", func(t *testing.T) {
		os.Setenv("ADMIN_SECRET", "s3cret")
		defer os.Unsetenv("ADMIN_SECRET")

		req := httptest.NewRequest(http.MethodPost, "/api/admin/run-cron", nil)
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Errorf("expected 403, got %d", rec.Code)
		}
	})

	t.Run("rejects wrong secret", func(t *testing.T) {
		os.Setenv("ADMIN_SECRET", "s3cret")
		defer os.Unsetenv("ADMIN_SECRET")

		req := httptest.NewRequest(http.MethodPost, "/api/admin/run-cron", nil)
		req.Header.Set("X-Admin-Secret", "wrong")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Errorf("expected 403, got %d", rec.Code)
		}
	})

	t.Run("allows matching secret", func(t *testing.T) {
		os.Setenv("ADMIN_SECRET", "s3cret")
		defer os.Unsetenv("ADMIN_SECRET")

		req := httptest.NewRequest(http.MethodPost, "/api/admin/run-cron", nil)
		req.Header.Set("X-Admin-Secret", "s3cret")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rec.Code)
		}
	})
}

// noopNext is only reached when ClerkAuthMiddleware lets a request through;
// none of the cases below should ever hit it, since they all fail before any
// DB or network call.
func noopNext(t *testing.T) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("next handler should not have been called")
	})
}

// signedToken builds a syntactically valid (but not necessarily verifiable)
// JWT for testing the pre-verification parsing/validation steps in
// ClerkAuthMiddleware. The signing key doesn't matter for these cases since
// they're all rejected before signature verification is reached.
func signedToken(t *testing.T, header map[string]interface{}, claims jwt.MapClaims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	for k, v := range header {
		token.Header[k] = v
	}
	signed, err := token.SignedString([]byte("test-signing-key"))
	if err != nil {
		t.Fatalf("failed to build test token: %v", err)
	}
	return signed
}

func TestClerkAuthMiddleware_RejectsBeforeReachingHandler(t *testing.T) {
	handler := ClerkAuthMiddleware(noopNext(t))

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

	t.Run("malformed token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/problems", nil)
		req.Header.Set("Authorization", "Bearer not-a-jwt")
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rec.Code)
		}
	})

	t.Run("token missing kid header", func(t *testing.T) {
		tok := signedToken(t, map[string]interface{}{}, jwt.MapClaims{"iss": "https://example.clerk.accounts.dev"})
		req := httptest.NewRequest(http.MethodGet, "/api/problems", nil)
		req.Header.Set("Authorization", "Bearer "+tok)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rec.Code)
		}
	})

	t.Run("token missing iss claim", func(t *testing.T) {
		tok := signedToken(t, map[string]interface{}{"kid": "test-kid"}, jwt.MapClaims{})
		req := httptest.NewRequest(http.MethodGet, "/api/problems", nil)
		req.Header.Set("Authorization", "Bearer "+tok)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rec.Code)
		}
	})
}

func TestParseRSAPublicKey(t *testing.T) {
	t.Run("round-trips a real RSA public key", func(t *testing.T) {
		key, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			t.Fatalf("failed to generate test key: %v", err)
		}

		nStr := base64.RawURLEncoding.EncodeToString(key.PublicKey.N.Bytes())
		eBytes := big.NewInt(int64(key.PublicKey.E)).Bytes()
		eStr := base64.RawURLEncoding.EncodeToString(eBytes)

		pub, err := parseRSAPublicKey(nStr, eStr)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if pub.N.Cmp(key.PublicKey.N) != 0 {
			t.Error("modulus mismatch")
		}
		if pub.E != key.PublicKey.E {
			t.Errorf("expected exponent %d, got %d", key.PublicKey.E, pub.E)
		}
	})

	t.Run("invalid base64 in n returns an error", func(t *testing.T) {
		_, err := parseRSAPublicKey("not-valid-base64!!!", "AQAB")
		if err == nil {
			t.Error("expected an error for invalid base64, got nil")
		}
	})

	t.Run("invalid base64 in e returns an error", func(t *testing.T) {
		_, err := parseRSAPublicKey("AQAB", "not-valid-base64!!!")
		if err == nil {
			t.Error("expected an error for invalid base64, got nil")
		}
	})
}
