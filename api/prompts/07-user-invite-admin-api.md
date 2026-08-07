# Prompt 07 — Admin User Invite / Role Update / Remove API

## Role
Backend for warehouse-scoped user administration via Supabase Auth Admin API + `app_users`.

## Problem Statement
- Invite: create Auth user (or generate invite link) + insert `app_users` with warehouse_id of caller
- Reject if email already in another warehouse
- Update role/details with audit `update_user`
- Remove: delete app_users (and Auth user policy — document cascade); audit `remove_user`
- Only role `admin` may call

## Connections
- Frontend Prompt 07
- FK `user_id` → auth.users CASCADE
- Testing cross-tenant invite

## Acceptance Criteria
- [ ] Service role used only on server
- [ ] Cannot change own role to lock out last admin without safeguard
