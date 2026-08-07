# Prompt 01 — Supabase Auth Session & App User Bootstrap API

## Role
Senior backend engineer for WareHouse (Next.js Route Handlers or Supabase Edge Functions — choose one stack and document it). Implement auth session endpoints and first-login `app_users` linkage.

## Problem Statement
Auth flow from `database.md`:
1. Supabase Auth returns JWT (`auth.uid()`)
2. App looks up `app_users`
3. RLS scopes all queries via `current_warehouse_id()`
4. Login/logout written to `audit_log`

Build:
- Server helpers to create Supabase clients (anon + service role — service role never exposed to browser)
- `/api/auth/session` — current user + warehouse + role
- Post-login hook: if `app_users` missing → 403 with “Ask admin to invite you” (no auto-join random warehouse)
- Audit insert for `login` / `logout` / `switch_warehouse` with ip, user_agent, session_id

## Connections
- Frontend Prompt 01 consumes session
- Database RLS helper `current_warehouse_id()`
- Rate limits: 15 login attempts / 15 min (`database.md` Rate Limiting)

## Acceptance Criteria
- [ ] No secret key in client bundles
- [ ] Audit rows insert-only
- [ ] Typed errors match Error Handling table
