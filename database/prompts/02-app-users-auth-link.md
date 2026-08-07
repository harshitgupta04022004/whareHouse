# Prompt 02 — app_users ↔ auth.users Linkage & Indexes

## Role
Database engineer. Harden the identity model that ties Supabase Auth to warehouse-scoped users.

## Problem Statement
`app_users.user_id` is both the Supabase Auth user id AND the warehouse-scoped identity. This prompt ensures the linkage is bulletproof.

Create and verify:
- **FK constraint:** `user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE` — when a Supabase Auth user is deleted, the `app_users` row cascades automatically. This is the only table with CASCADE to `auth.users`.
- **Index:** `idx_users_warehouse` on `warehouse_id` — speeds up `current_warehouse_id()` lookups
- **UNIQUE on email:** prevents duplicate accounts across warehouses (global uniqueness)
- **Trigger guard (optional but recommended):** prevent changing `warehouse_id` after initial insert — users can only belong to one warehouse at a time. If a user needs to move warehouses, delete and recreate.
- **Service role insert path:** when an admin invites a user, the insert into `app_users` uses the service role key (bypasses RLS). Document this clearly so the backend prompt knows how to call it.
- **RLS on app_users:** `SELECT` only with `warehouse_id = current_warehouse_id()` — staff cannot see other warehouses' users
- **FK to warehouses uses `ON DELETE RESTRICT`** — you cannot delete a warehouse while users still reference it. Users must be removed first (admin user management flow).

## Key Decisions
- `ON DELETE CASCADE` on auth.users means: if a Supabase Auth user is permanently deleted, their app_users row vanishes. This is intentional for cleanup.
- `ON DELETE RESTRICT` on warehouses means: warehouse deletion is blocked until all users are removed. This prevents orphaned users.
- Email is `UNIQUE` globally — no two users across all warehouses can share an email. This prevents confusion during invites.

## Connections
- Backend invite API: `backend/07` inserts via service role
- `current_warehouse_id()` function depends on this table having a row for every authenticated user
- Frontend shell reads role from this table for nav visibility
- RLS policies on every other table depend on `current_warehouse_id()` which queries this table

## Acceptance Criteria
- [ ] FK, indexes, UNIQUE constraints match the DDL in database.md exactly
- [ ] `ON DELETE CASCADE` to auth.users confirmed working (test: delete auth user → app_users row gone)
- [ ] `ON DELETE RESTRICT` to warehouses confirmed (test: try delete warehouse with users → blocked)
- [ ] Service role insert documented for backend invite flow
