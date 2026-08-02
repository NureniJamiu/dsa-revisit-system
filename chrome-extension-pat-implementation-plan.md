# PAT implementation plan

Follows the decision in `chrome-extension-auth-planning.md` (personal access tokens, not Clerk Sync Host). This is the concrete plan for shipping it: schema, backend endpoints, middleware, settings UI, extension-side flow. No code yet.

## 1. Schema

New table, added to both `database/schema.sql` and `db.go`'s `runMigrations()` per the project's migration convention:

```sql
CREATE TABLE IF NOT EXISTS personal_access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL DEFAULT 'Chrome extension',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_pat_token_hash ON personal_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_pat_user ON personal_access_tokens(user_id) WHERE revoked_at IS NULL;
```

Tokens are never stored in plaintext — only a SHA-256 hash (`token_hash`), same idea as `password_hash` patterns elsewhere. `revoked_at` is a soft delete: revoking sets the timestamp instead of deleting the row, so `last_used_at` history survives for the settings page. Plaintext format: `restack_pat_<32 random bytes, base64url>` — a recognizable prefix makes it obvious what leaked if a token shows up somewhere it shouldn't (same idea as `sk-` / `ghp_` prefixes).

## 2. Backend: token model + helpers (new `pat.go`)

Following the file-per-concern convention (`auth.go`, `db.go`, etc. are all flat in `package main`):

- `GeneratePAT() (plaintext string, hash string, err error)` — `crypto/rand`, 32 bytes, base64url-encode with the `restack_pat_` prefix; hash is `sha256.Sum256` of the full plaintext string, hex-encoded.
- `CreatePAT(userID uuid.UUID, label string) (plaintext string, id uuid.UUID, err error)` — generates, inserts, returns plaintext (only time it's ever returned).
- `ResolvePAT(tokenStr string) (userID uuid.UUID, err error)` — hashes the incoming token, looks up `WHERE token_hash = $1 AND revoked_at IS NULL`, updates `last_used_at` (best-effort, don't fail the request if this write fails), returns `user_id`.
- `ListPATs(userID uuid.UUID) ([]PATSummary, error)` — id, label, created_at, last_used_at, revoked_at — never the hash.
- `RevokePAT(userID, tokenID uuid.UUID) error` — `UPDATE ... SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`, scoped by user_id so one user can't revoke another's token by guessing an ID.

`models.go` gets a `PersonalAccessToken` / `PATSummary` struct alongside the existing structs.

## 3. Middleware: `auth.go`

Rename nothing — add a dispatcher in front of the two auth strategies. Clerk JWTs and PATs are trivially distinguishable: PATs start with `restack_pat_`, JWTs are three dot-separated base64 segments starting with `eyJ`.

```go
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        authHeader := r.Header.Get("Authorization")
        tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

        if strings.HasPrefix(tokenStr, "restack_pat_") {
            userID, err := ResolvePAT(tokenStr)
            if err != nil {
                http.Error(w, `{"error":"invalid or revoked token"}`, http.StatusUnauthorized)
                return
            }
            ctx := context.WithValue(r.Context(), userIDKey, userID)
            next.ServeHTTP(w, r.WithContext(ctx))
            return
        }

        ClerkAuthMiddleware(next).ServeHTTP(w, r)
    })
}
```

`main.go`'s route group swaps `r.Use(ClerkAuthMiddleware)` for `r.Use(AuthMiddleware)`. Everything downstream — every handler's `GetUserIDFromContext(r)` call and `WHERE user_id = $N` scoping — is unchanged, since both paths resolve to the same context key. This is the "mostly additive" property from the planning doc holding up in practice.

One thing to decide: whether PAT-authenticated requests should be allowed to hit every route, or only the subset the extension actually needs (`GET /api/problems/today`, `POST /api/problems`, maybe `GET /api/problems`). Recommend starting unscoped (matches how Clerk sessions work today — no route-level permission concept exists anywhere in this app) and revisiting only if a real scoping need shows up. Keeping it simple avoids inventing a scopes/permissions system for a single extension.

## 4. Backend: new endpoints (`handlers.go` + `main.go`)

```
POST   /api/tokens        CreateToken   — { label } -> { id, token, label, created_at }  (token is plaintext, shown once)
GET    /api/tokens        ListTokens    -> { tokens: [{ id, label, created_at, last_used_at, revoked_at }] }
DELETE /api/tokens/{id}   RevokeToken   -> 204
```

All three go inside the existing `r.Group` that uses `AuthMiddleware` — issuing/listing/revoking tokens itself requires being logged in (via Clerk, in practice, since that's how the settings page is reached). `CreateToken` and `RevokeToken` both call `GetUserIDFromContext(r)` and scope to it, same pattern as every other handler.

`CreateToken` validates `label` is non-empty (reuse the `validateProblemInput`-style small validator pattern), defaults to "Chrome extension" if omitted.

## 5. Frontend: settings page

`Settings.tsx` already has sections for scheduler and email prefs — add an "API Tokens" section following the same `useQuery`/`useMutation` + `apiFetch` pattern as the rest of the file (per `useProblems.ts` conventions, add a `useTokens.ts` hook file with `tokenKeys`, `useTokens()`, `useCreateToken()`, `useRevokeToken()`, mirroring `problemKeys`/`useProblems`).

UI: a list of existing tokens (label, created date, last used, a Revoke button), plus a "Generate new token" button that opens a modal. On creation, show the plaintext token in a copyable box with a one-time warning ("This won't be shown again") — same UX as GitHub/Linear/Notion PAT pages referenced in the planning doc. No plaintext token is ever refetched or displayed again after that first render.

## 6. Extension-side flow

Matches the flow described in the planning doc: extension popup shows "Connect your account," opens `{FRONTEND_URL}/settings` in a real tab (not inside the popup, sidestepping any popup/OAuth limitation entirely since this is just a normal authenticated page load). User generates a token there, copies it, pastes it into an input in the extension popup. Extension stores it in `chrome.storage.local` (not `localStorage` — standard for extensions, survives across browser restarts, isolated per-extension). Every subsequent API call from the extension (content script or side panel) attaches `Authorization: Bearer <token>` directly — no `apiFetch`/Clerk `getToken()` involved, since the extension isn't a Clerk-aware context.

Manifest needs `host_permissions` for the backend API origin (and whichever coding-platform domains the scraper content scripts run on — LeetCode, HackerRank, NeetCode, GFG). No cookie permissions needed, which is the whole point of not using Sync Host.

If the stored token is ever invalid (revoked, or user pastes garbage), the API returns 401 — extension should catch that and re-show the "Connect your account" state rather than failing silently.

## 7. Rollout order

1. Migration (schema + `runMigrations()`) — deploy alone first, table exists but nothing uses it yet.
2. `pat.go` + `AuthMiddleware` swap + `/api/tokens` endpoints — backend-only deploy, no frontend changes yet. `AuthMiddleware` is a strict superset of `ClerkAuthMiddleware`'s behavior (falls through to it for anything not prefixed `restack_pat_`), so this is safe to ship without touching the frontend at all.
3. Settings page UI for generating/revoking tokens.
4. Extension build itself (separate effort — scraping per platform, manifest, popup/side-panel UI) — out of scope for this plan, which only covers the auth mechanism it depends on.

## 8. Testing

Follow the existing `auth_test.go` pattern. Cover: valid PAT resolves to correct user_id, revoked PAT is rejected, unknown/garbage token is rejected, `last_used_at` updates on successful auth, `RevokePAT` can't revoke another user's token, `AuthMiddleware` correctly dispatches both a PAT-prefixed token and a Clerk JWT to the right path.
