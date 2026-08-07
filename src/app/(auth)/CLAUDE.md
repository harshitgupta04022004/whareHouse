# src/app/(auth)/ — Authentication Pages

Login and signup routes. Supabase Auth handles session management; these pages provide the UI.

## Key Files
- `login/page.tsx` — Login form: email + password, error display, redirect to `/DOs`
- `signup/page.tsx` — Signup form: name + email + password, validation, redirect to `/DOs`
- `layout.tsx` — Auth layout (centered card, aurora background)

## Current Implementation
- Uses `useAuth()` from `AuthProvider` for `login()` and `signup()` calls
- Client-side validation (email format, password length)
- Error messages displayed inline with red styling
- Loading states disable submit button with spinner
- Post-auth redirect via `router.push("/DOs")`

## What Needs Changing (per prompts)
- Migrate from localStorage auth to Supabase Auth client
- Add password visibility toggle
- Add `aria-live` regions for screen reader error announcements
- Add loading skeletons during session check
- Implement password reset flow
- Add error boundaries around auth forms

## Prompts in This Directory
1. `01-auth-login-signup-ui.md` — Core login/signup UI with Supabase Auth
2. `11-password-reset-forgot-flow.md` — Password reset via email
3. `12-error-boundary-loading-skeletons.md` — Error boundaries + loading states

## Related
- Auth backend API: `../../api/prompts/01-supabase-auth-session-api.md`
- Auth context: `../../components/AuthProvider.tsx`
- Database users table: `../../database/prompts/02-app-users-auth-link.md`


---

# Imported Prompts

## 01-auth-login-signup-ui.md

# Prompt 01 — Auth Login & Signup UI (WareHouse)

## Role
You are a senior frontend engineer building the WareHouse challan app (Next.js 16 + React 19 + Tailwind CSS 4) described in `database.md`. Implement production-ready authentication screens only — no backend logic beyond wiring to Supabase Auth client helpers.

## Problem Statement
Warehouse staff currently rely on Google Sheets. The new web app must replace that with a clear, trustworthy sign-in experience. Users authenticate via **Supabase Auth** (email/password primary; Google OAuth optional). After login, the app resolves `app_users` so RLS can scope every query to `current_warehouse_id()`.

Today the repo has stub pages under `website/src/app/(auth)/login` and `signup`. They need:
- Accessible forms (labels, `autocomplete`, error regions) per [MDN form best practices](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms)
- Password visibility toggle, client-side validation before submit
- Loading / disabled states that prevent double-submit
- Friendly mapping of Auth errors (wrong password, unconfirmed email, rate limit)
- Redirect into the dashboard route group after session is established
- Remember last email in `localStorage` (preferences only — never store passwords)

## Visual / UX Decisions (use these sources)
- Palette from [Color Hunt — Industrial Warehouse](https://colorhunt.co/palette/2c3333395b64a5c9cae7f6f2) or similar earth/steel tones: deep charcoal `#2C3333`, slate `#395B64`, mist `#A5C9CA`, paper `#E7F6F2`. Avoid purple-on-white AI clichés.
- Typography: expressive but readable — e.g. **Source Serif 4** for brand wordmark + **IBM Plex Sans** for UI (load via `next/font`). Brand name **WareHouse** must dominate the first viewport per product design rules.
- Motion: subtle fade-in of the form (CSS `@keyframes` / [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)); focus rings that meet WCAG 2.2.
- Layout: single composition — brand, one headline (“Sign in to your warehouse”), one short line, form + CTA. No card grids in the hero.

## Connections
| Layer | Dependency |
|-------|------------|
| Backend | Prompt `backend/01` — session cookies / JWT handling |
| Database | `app_users.user_id` = `auth.users.id`; login must write `audit_log` action `login` |
| Testing | Prompt `testing/01` — Playwright auth happy path + lockout UI |
| Production | Prompt `production/01` — env vars `NEXT_PUBLIC_SUPABASE_URL`, anon key |

## Acceptance Criteria
- [ ] Login + signup pages work on mobile and desktop
- [ ] Keyboard-only usable; screen-reader announces field errors (`aria-live`)
- [ ] Invalid credentials show non-leaky messages
- [ ] Successful auth lands on dashboard with session available to `AuthProvider`
- [ ] Documents MDN references used for form controls in a short comment block at top of the form component

## Out of Scope
User management admin UI, password-reset email templates (separate prompt), Google Drive.


---

## 11-password-reset-forgot-flow.md

# Prompt 11 — Password Reset / Forgot Password UI

## Role
Frontend engineer implementing the password reset flow for Supabase Auth.

## Problem Statement
database.md § Authentication mentions Supabase Auth with email/password. Users need a way to reset forgotten passwords.

### Screens Required
1. **Forgot Password** — email input form, submits to Supabase `resetPasswordForEmail()`
2. **Confirmation message** — "Check your email for a reset link"
3. **Reset Password** — new password + confirm password form (arrived via email link with `#access_token` hash)
4. **Success** — redirect to login with "Password reset successful" toast

### Validation
- Email: valid format, required
- New password: min 8 chars, at least 1 number, at least 1 letter
- Confirm password: must match
- Show/hide password toggle on both password fields

### Supabase Integration
```typescript
// Forgot Password
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset-password`,
});

// Update Password (after clicking link)
const { error } = await supabase.auth.updateUser({ password: newPassword });
```

### Rate Limiting
database.md limits password reset to 5 attempts per hour. The frontend should:
- Show "Too many reset attempts. Try again in 1 hour." on 429
- Disable submit button for 60 seconds after each attempt (UX cooldown)
- Never reveal whether the email exists in the system (security)

### Error Messages
- "If an account exists with this email, you'll receive a reset link." (always same message, prevents email enumeration)
- "Invalid or expired reset link. Request a new one." (bad token)
- "Passwords do not match." (client-side)
- "Password must be at least 8 characters." (client-side)

## Visual Decisions
- Same industrial palette (charcoal/slate/mist/paper)
- Simple centered form, no hero section needed
- Clear success/error states with [MDN form validation](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Constraint_validation)

## Connections
- Backend: Supabase Auth handles the token flow (no custom backend needed)
- Auth prompt `frontend/01` should link to "Forgot password?"
- Rate limit: `backend/09` limits reset attempts
- Audit: reset attempts logged as `login` action with metadata

## Acceptance Criteria
- [ ] Forgot password form works end-to-end
- [ ] Reset link arrives in email (test with real or mock Supabase)
- [ ] Password update works and user can login with new password
- [ ] Rate limit message shown after 5 attempts
- [ ] Email enumeration prevented (same message for valid/invalid email)


---

## 12-error-boundary-loading-skeletons.md

# Prompt 12 — Error Boundaries, Loading Skeletons & Empty States

## Role
Frontend engineer implementing the resilience and polish layer for all pages.

## Problem Statement
The app must handle errors, loading, and empty states gracefully across every screen.

### React Error Boundary
Create a reusable `ErrorBoundary` component (class or `react-error-boundary`):
- Catches render errors in child components
- Shows friendly error UI: "Something went wrong" + error message + "Try again" button
- Logs error to Sentry or console for debugging
- Does NOT crash the entire app — only the affected section
- Per [MDN Error Handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch)

### Loading Skeletons
Every data-fetching screen needs skeleton placeholders:
- DO list: table row skeletons (5 rows)
- Dashboard: matrix cell skeletons
- Items/Parties: list item skeletons (8 items)
- Audit: log row skeletons (10 rows)
- Use CSS `@keyframes` shimmer animation on skeleton blocks
- Match the layout of actual content (height, width, spacing)

### Empty States
When data is legitimately empty:
- DO list with no DOs: "No delivery orders yet. Create your first DO."
- Items with no items: "No items added. Add your first product."
- Dashboard with no data: "No inventory movements in this period."
- Audit with no logs: "No audit entries yet."
- Each empty state has a CTA button linking to the relevant create screen

### Error Toast System
- Success: green toast, auto-dismiss 3s
- Error: red toast, manual dismiss, includes error message
- Warning: amber toast, auto-dismiss 5s
- Info: blue toast, auto-dismiss 3s
- Use `aria-live="polite"` for screen reader announcements

### Network Error Handling
- Fetch failures → show "Connection error. Please check your network."
- Timeout → show "Request timed out. Please try again."
- 403 → show "You don't have permission for this action."
- 429 → show rate limit message from `backend/09`
- 500 → show "Something went wrong. Please try again later."

## Connections
- Used by every frontend prompt (01–10)
- Backend error responses (`database.md` § Error Handling) map to these UI states
- Offline banner from `frontend/09` integrates with this error system

## Acceptance Criteria
- [ ] Error boundary catches and displays render errors
- [ ] Every list page has a skeleton loader
- [ ] Every list page has an empty state with CTA
- [ ] Toast system announces to screen readers
- [ ] Network errors mapped to friendly messages


---

