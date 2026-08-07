# Prompt 12 — Google OAuth Optional Integration

## Role
Backend engineer setting up Google OAuth as an optional login method via Supabase Auth.

## Problem Statement
database.md § Authentication lists Google OAuth as optional fallback. If configured, users can sign in with Google.

### Supabase Google OAuth Setup
1. Enable Google provider in Supabase Dashboard → Authentication → Providers
2. Add Google Client ID and Client Secret to Supabase env
3. Configure redirect URL: `{SUPABASE_URL}/auth/v1/callback`

### OAuth Flow
1. User clicks "Sign in with Google" button
2. Frontend calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
3. User authenticates with Google
4. Google redirects back to app with auth code
5. Supabase exchanges code for JWT
6. App looks up `app_users` by `auth.uid()`
7. If no `app_users` row → show "Ask admin to add you to a warehouse"
8. If `app_users` exists → proceed to dashboard

### Account Linking
- Google OAuth creates a Supabase Auth user with `app_users.user_id = auth.uid()`
- If user already has email/password account, Supabase can link them (same email)
- The `app_users` row is shared — no duplicate accounts

### Security
- CSRF protection via `state` parameter (Supabase handles)
- Redirect URL must be whitelisted in Google Console
- Never store Google tokens client-side
- Rate limit OAuth callbacks (same as login: 15/15 min)

### Frontend Button
- Show "Sign in with Google" button on login page (if configured)
- Use Google's official button styling or brand guidelines
- Button disabled when form is submitting

## Connections
- Frontend `frontend/01` adds Google sign-in button
- Backend `backend/01` handles session for OAuth users
- `app_users` linkage same as email/password flow
- Audit logs OAuth logins as `login` with provider metadata

## Acceptance Criteria
- [ ] Google OAuth works end-to-end (if configured)
- [ ] Falls back gracefully if Google OAuth not configured (button hidden)
- [ ] Same `app_users` row used for both auth methods
- [ ] OAuth callback rate-limited
