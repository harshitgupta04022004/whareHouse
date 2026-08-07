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
