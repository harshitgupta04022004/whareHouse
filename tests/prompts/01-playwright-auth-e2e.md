# Prompt 01 — Playwright E2E: Auth Happy Path & Lockout UX

## Role
QA automation engineer. Add Playwright tests for WareHouse auth screens and wire them for local + CI.

## Problem Statement
Manual login testing will miss regressions. Create E2E coverage:
- Signup validation errors (empty fields, bad email) using accessible selectors (`getByLabel`, `getByRole`) — see [MDN ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- Successful login redirects to dashboard
- Invalid password shows safe error
- After N failures, UI reflects rate-limit / lock messaging from API
- Session cookie present; logout clears session and returns to login

Use a dedicated Supabase test project or local stubs — never production credentials.

## Connections
- Frontend auth Prompt 01; backend session Prompt 01
- GitHub Actions workflow Prompt 05 will run these
- Database seed users from `database/01` seed

## Acceptance Criteria
- [ ] `npx playwright test` passes headless
- [ ] Screenshots on failure uploaded as CI artifacts
- [ ] No hardcoded real user passwords in repo (use env secrets)
