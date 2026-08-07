# Prompt 10 — Go-Live Launch Checklist (Production Integration Ready)

## Role
Final integration owner. Produce a single go-live checklist that ties every layer together.

## Problem Statement
Create `docs/GO_LIVE.md` covering:
1. Secrets rotated; env set
2. Migrations applied; RLS review signed
3. CI green on release tag
4. Preview + staging sign-off (auth, DO create, dashboard, upload, audit)
5. Monitoring & backups verified
6. Support contacts; feature flags if any
7. Post-launch: watch error budget 48h

Include UX polish pass: Color Hunt tokens consistent; forms still meet [MDN accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility) basics.

## Connections
- Depends on completion signals from frontend/backend/database/testing prompts
- Cutover Prompt 09 executed or scheduled

## Acceptance Criteria
- [ ] Checklist with owners + dates
- [ ] Explicit “integration ready for production” sign-off section
