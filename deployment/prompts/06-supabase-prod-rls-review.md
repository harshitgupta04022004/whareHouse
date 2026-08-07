# Prompt 06 — Supabase Production Hardening & RLS Review Gate

## Role
Pre-launch database production checklist — the final security sign-off before real users.

## Problem Statement
Before any real user data enters the system, verify every security control.

### RLS Review Checklist
- [ ] RLS enabled on ALL 8 tables (warehouses, app_users, parties, items, delivery_orders, do_items, audit_log, files)
- [ ] `current_warehouse_id()` function deployed and working
- [ ] Each table has correct policies (match database.md § RLS exactly)
- [ ] `audit_log` UPDATE/DELETE revoked from `authenticated` role
- [ ] `anon` role has no access to business tables
- [ ] Cross-warehouse SELECT returns zero rows (manual test)
- [ ] Cross-warehouse INSERT fails (manual test)

### Grants Review
- `authenticated` role: SELECT on views (product_summary, item_totals), ALL on business tables (subject to RLS)
- `service_role`: used only in server-side code (backend API routes)
- `anon`: no access to any business table

### Connection Pooling
- Enable Supavisor (Supabase connection pooler) for serverless
- Connection limit per project tier documented
- PgBouncer not needed (Supavisor replaces it)

### PITR (Point-in-time Recovery)
- Enable on Pro plan (30-day retention)
- Verify PITR works by restoring to a specific timestamp in staging
- Document recovery procedure for operators

### Performance
- Verify indexes exist for all query patterns
- Run `EXPLAIN ANALYZE` on key queries (DO list, dashboard)
- Confirm no full table scans on hot paths

### Sign-off
- Engineer signs off with date and name
- Staging parity confirmed (same schema, same RLS, same indexes)
- Any deviations documented and approved

## Connections
- All database prompts (01–10) must be complete before this review
- Testing Prompt 02 (RLS suite) must pass against staging
- Production Prompt 02 (deploy) blocked until this sign-off

## Acceptance Criteria
- [ ] All checklist items verified
- [ ] Cross-warehouse isolation manually tested
- [ ] PITR tested in staging
- [ ] Sign-off document completed
