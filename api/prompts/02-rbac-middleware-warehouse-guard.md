# Prompt 02 — RBAC Middleware & Warehouse Isolation Guards

## Role
Implement application-layer RBAC matching the matrices in `database.md` (defense in depth on top of RLS).

## Problem Statement
Even with RLS, staff must not call admin-only APIs successfully.
- Middleware maps route → allowed roles
- Staff DO queries force `user_id = auth.uid()`
- Admin/manager may act on any DO in warehouse
- Return 403 with stable error code `permission_denied`
- Never accept `warehouse_id` from client body for scoping — derive from `app_users`

## Connections
- Frontend shell hides links but this is the real enforcement
- Testing Prompt 02 attacks cross-tenant IDs
- Complements `database/03` RLS policies

## Acceptance Criteria
- [ ] Centralized policy module unit-tested
- [ ] Logs denied attempts to audit as ERROR or security event
