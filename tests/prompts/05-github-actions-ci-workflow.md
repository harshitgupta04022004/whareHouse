# Prompt 05 — GitHub Actions CI Workflow (Lint, Typecheck, Test, Build)

## Role
DevOps engineer creating `.github/workflows/ci.yml` for the WareHouse monorepo/`website` app.

## Problem Statement
On pull_request + push to main:
1. Install deps (npm ci)
2. ESLint + `tsc --noEmit`
3. Unit tests
4. Start Supabase local / use service container Postgres with migrations applied
5. Integration + RLS suites
6. Playwright (with webServer)
7. `next build`
Fail fast; cache npm; upload artifacts (playwright-report, coverage).

Reference: [GitHub Actions docs](https://docs.github.com/en/actions), [MDN progressive enhancement mindset](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement) — CI should catch a11y regressions via axe if feasible.

## Connections
- All testing prompts plug into this workflow
- Production deploy Prompt 02 only after CI green
- Secrets: `SUPABASE_TEST_*`, `PLAYWRIGHT_*` via GitHub Secrets — never commit `.env` from database.md

## Acceptance Criteria
- [ ] Workflow file complete with concurrency group cancel-in-progress
- [ ] Status badge snippet for README
- [ ] Branch protection instructions documented
