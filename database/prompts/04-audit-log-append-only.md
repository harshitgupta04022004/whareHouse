# Prompt 04 — audit_log Table, Grants & Indexes

## Role
Create append-only `audit_log` with JSONB snapshots and hash columns.

## Problem Statement
- Identity PK `log_id`
- Indexes: warehouse+ts, entity, user, session
- `REVOKE UPDATE, DELETE ON audit_log FROM authenticated` (and anon)
- RLS select/insert own warehouse only
- Comment columns for operators

## Connections
- Backend audit writer
- Frontend audit viewer
- Backup exports daily CSV

## Acceptance Criteria
- [ ] Update/delete as authenticated fails
- [ ] Insert works with valid warehouse_id
