# Why I Didn't Use Clerk's Chrome Extension SDK

I'm building a Chrome extension for ReStack, my spaced-repetition tracker for DSA practice problems. The idea is simple: you're grinding through LeetCode or HackerRank or GFG, you hit a problem worth revisiting later, and instead of tabbing over to the dashboard and typing the title into a form, you just click the extension. One click and it's on your list.

The scraping is the easy part, just a small parser per platform. The harder question is how the extension proves who you are. My backend is a Go API behind Clerk, and every protected route pulls the user's ID out of a JWT that Clerk mints and refreshes on the frontend, which works because a web app always has a browser tab around to keep that session alive. An extension popup opens, does its thing, and closes. There's no tab around to refresh anything, so the real question is what "logged in" even means for something that isn't a persistent browser tab.

I ended up going with a personal access token, not Clerk's own Sync Host feature for extensions, even though Sync Host would have been the more obvious pick since Clerk already handles auth everywhere else in this app.

## Why not Sync Host

Clerk ships an SDK for this, `@clerk/chrome-extension`, built around a feature called Sync Host. If a user is already signed into the web app in some tab, the extension picks up that same session automatically, no separate login inside the extension at all. It works through cookies: the extension gets permission to read cookies from the app's host and from Clerk's own frontend API domain, its ID gets registered with Clerk, and the session carries over.

A few things ruled it out here.

Clerk's quickstart is built around Plasmo, a specific extension framework. You can wire `@clerk/chrome-extension` up manually without it, but the whole guide assumes their scaffolding, which means adopting a new build tool just to get auth working.

OAuth doesn't work inside the extension popup. Signing in with Google or GitHub through Clerk needs a redirect back from the identity provider, and Chrome doesn't support that inside a popup. Clerk's docs say this outright. So the moment an app leans on social login, popup-based sign-in breaks for a chunk of users, and the workaround is sending them to sign in on the actual website first.

The one that actually decided it: I want the extension's main surface to be a side panel showing today's problems, not a popup that closes the second you click away. Clerk's own documentation says Sync Host doesn't refresh properly in a side panel yet. Sign in somewhere else, and the panel keeps showing you as logged out until you close and reopen it, a bug sitting directly on top of the one feature I care most about getting right.

Sync Host is still a good fit for a lot of extensions, especially ones that live in a popup and don't depend on social login. It just doesn't fit this one.

## The token, technically

The flow looks like this: the user installs the extension, the popup shows a "connect your account" button, and clicking it opens a real browser tab to a settings page on the web app. Since it's a regular tab, none of Sync Host's popup or OAuth limitations apply. That page hits a new endpoint that creates a token, stores a hash of it, and shows the plaintext version exactly once. The user pastes it into the extension, and every request from then on carries it.

GitHub, Linear, and Notion already use this same pattern for the same problem: letting an external tool talk to your account without giving it its own login flow.

On the backend it's mostly additive. Every request already resolves to a `userID` that every query filters on. The only change is a second way to arrive at that same ID:

```go
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")

		if looksLikeClerkJWT(token) {
			ClerkAuthMiddleware(next).ServeHTTP(w, r)
			return
		}

		userID, err := resolvePersonalAccessToken(token)
		if err != nil {
			http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
```

And the token table:

```sql
CREATE TABLE personal_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL,
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);
```

Clerk still owns passwords, sessions, and MFA, everything about how someone becomes an authenticated user in the first place. A personal access token is just a second, narrower credential issued to someone who already proved who they are through Clerk, closer to cutting a spare key than building a new lock.

## Why this matters beyond the extension

Sync Host only ever solves the extension. A personal access token solves the general case: letting anything that isn't a browser tab talk to a user's account. A CLI tool, a public API, a future mobile app, all of them plug into the same mechanism, issue a token, scope it to a user, let them revoke it. That reach is worth more long-term than a slightly smoother login screen for one feature.

## Sources

- [Clerk Chrome Extension SDK, overview](https://clerk.com/docs/reference/chrome-extension/overview)
- [Sync auth status between your Chrome Extension and web app](https://clerk.com/docs/guides/sessions/sync-host)
