# Prompt 01 — Production Environment & Secrets Management

## Role
Platform engineer preparing WareHouse for production configuration.

## Problem Statement
`database.md` lists sensitive keys (Supabase, Google, DATABASE_URL). Production must:
- Use Vercel/Fly/Render + Supabase secrets — **rotate any secrets that were committed to markdown**
- Split `NEXT_PUBLIC_*` vs server-only keys
- Provide `.env.example` with empty placeholders (no real values)
- Document secret rotation runbook
- Block accidental commit via `.gitignore` + optional secret scan in CI (gitleaks)

Warn: values currently present in `database.md` Environment Variables section must be treated as compromised and rotated.

## Connections
- Every frontend/backend runtime
- GitHub Actions secrets for CI
- Google SA JSON never in git

## Acceptance Criteria
- [ ] `.env.example` complete
- [ ] Rotation checklist merged
- [ ] No secrets in client bundle (build inspect script)
