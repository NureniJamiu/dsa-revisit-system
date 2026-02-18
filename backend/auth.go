package main

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// ---------- context key ----------
type contextKey string

const userIDKey contextKey = "userID"

// GetUserIDFromContext retrieves the authenticated user's internal UUID from the request context.
func GetUserIDFromContext(r *http.Request) uuid.UUID {
	if id, ok := r.Context().Value(userIDKey).(uuid.UUID); ok {
		return id
	}
	return uuid.Nil
}

// ---------- JWKS cache ----------
type jwksCache struct {
	mu        sync.RWMutex
	keys      map[string]*rsa.PublicKey
	fetchedAt time.Time
	ttl       time.Duration
}

var jwks = &jwksCache{ttl: 1 * time.Hour}

type jwksResponse struct {
	Keys []jwkKey `json:"keys"`
}

type jwkKey struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Alg string `json:"alg"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
}

func (c *jwksCache) getKey(kid, issuer string) (*rsa.PublicKey, error) {
	c.mu.RLock()
	if time.Since(c.fetchedAt) < c.ttl && c.keys != nil {
		if key, ok := c.keys[kid]; ok {
			c.mu.RUnlock()
			return key, nil
		}
	}
	c.mu.RUnlock()

	// Fetch fresh keys using the issuer from the JWT
	if err := c.refresh(issuer); err != nil {
		return nil, err
	}

	c.mu.RLock()
	defer c.mu.RUnlock()
	if key, ok := c.keys[kid]; ok {
		return key, nil
	}
	return nil, fmt.Errorf("key %s not found in JWKS", kid)
}

func (c *jwksCache) refresh(issuer string) error {
	// The JWKS URL is the issuer + /.well-known/jwks.json
	jwksURL := strings.TrimSuffix(issuer, "/") + "/.well-known/jwks.json"

	resp, err := http.Get(jwksURL)
	if err != nil {
		return fmt.Errorf("failed to fetch JWKS from %s: %w", jwksURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint returned status %d", resp.StatusCode)
	}

	var jwksResp jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&jwksResp); err != nil {
		return fmt.Errorf("failed to decode JWKS: %w", err)
	}

	keys := make(map[string]*rsa.PublicKey)
	for _, k := range jwksResp.Keys {
		if k.Kty != "RSA" {
			continue
		}
		pubKey, err := parseRSAPublicKey(k.N, k.E)
		if err != nil {
			log.Printf("Skipping JWK kid=%s: %v", k.Kid, err)
			continue
		}
		keys[k.Kid] = pubKey
	}

	c.mu.Lock()
	c.keys = keys
	c.fetchedAt = time.Now()
	c.mu.Unlock()
	return nil
}

func parseRSAPublicKey(nStr, eStr string) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(nStr)
	if err != nil {
		return nil, err
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(eStr)
	if err != nil {
		return nil, err
	}
	n := new(big.Int).SetBytes(nBytes)
	e := 0
	for _, b := range eBytes {
		e = e<<8 + int(b)
	}
	return &rsa.PublicKey{N: n, E: e}, nil
}

// ---------- Middleware ----------

// ClerkAuthMiddleware validates the Clerk JWT and injects the internal user ID into context.
func ClerkAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, `{"error":"missing or invalid Authorization header"}`, http.StatusUnauthorized)
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		// Parse without validation first to get the kid
		parser := jwt.NewParser(jwt.WithoutClaimsValidation())
		unverified, _, err := parser.ParseUnverified(tokenStr, jwt.MapClaims{})
		if err != nil {
			http.Error(w, `{"error":"invalid token format"}`, http.StatusUnauthorized)
			return
		}

		kid, ok := unverified.Header["kid"].(string)
		if !ok || kid == "" {
			http.Error(w, `{"error":"token missing kid header"}`, http.StatusUnauthorized)
			return
		}

		// Get the signing key — use the issuer from the unverified token to build the JWKS URL
		unverifiedClaims, _ := unverified.Claims.(jwt.MapClaims)
		issuer, _ := unverifiedClaims["iss"].(string)
		if issuer == "" {
			http.Error(w, `{"error":"token missing iss claim"}`, http.StatusUnauthorized)
			return
		}

		pubKey, err := jwks.getKey(kid, issuer)
		if err != nil {
			log.Printf("JWKS key lookup failed: %v", err)
			http.Error(w, `{"error":"unable to verify token"}`, http.StatusUnauthorized)
			return
		}

		// Now fully validate
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return pubKey, nil
		}, jwt.WithExpirationRequired())

		if err != nil || !token.Valid {
			http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, `{"error":"invalid token claims"}`, http.StatusUnauthorized)
			return
		}

		clerkUserID, _ := claims["sub"].(string)
		if clerkUserID == "" {
			http.Error(w, `{"error":"token missing sub claim"}`, http.StatusUnauthorized)
			return
		}

		// Extract email from Clerk JWT claims (if available)
		clerkEmail, _ := claims["email"].(string)

		// Auto-provision or find existing user
		internalID, err := FindOrCreateUserByClerkID(clerkUserID, clerkEmail)
		if err != nil {
			log.Printf("User provisioning failed for clerk_id=%s: %v", clerkUserID, err)
			http.Error(w, `{"error":"user provisioning failed"}`, http.StatusInternalServerError)
			return
		}

		// Inject into context
		ctx := context.WithValue(r.Context(), userIDKey, internalID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
