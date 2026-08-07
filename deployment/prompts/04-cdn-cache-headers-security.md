# Prompt 04 — CDN Cache Headers, CSP & Security Headers

## Role
Implement Browser Caching Strategy + security headers for production.

## Problem Statement
From `database.md` caching section + modern hardening:
- Immutable hashed static assets: long `Cache-Control`
- HTML/document: no long public cache
- API: `private, no-store` for authenticated JSON
- Security headers: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- Optional service worker carefully scoped (do not cache authenticated API blindly)

Use Next.js `headers()` in `next.config` and verify with browser Network panel / [MDN Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control).

## Connections
- Frontend offline Prompt 09
- CDN in front of deploy Prompt 02

## Acceptance Criteria
- [ ] Header checklist tested on staging
- [ ] CSP allows Supabase + Drive domains only as needed
