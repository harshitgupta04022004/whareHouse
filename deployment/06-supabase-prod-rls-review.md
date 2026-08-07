# Supabase Production RLS Review Checklist

## Pre-Launch Security Sign-off

Complete ALL items before any real user data enters the system.

### RLS Policy Verification
- [ ] RLS enabled on ALL 8 tables:
  - [ ] `warehouses`
  - [ ] `app_users`
  - [ ] `parties`
  - [ ] `items`
  - [ ] `delivery_orders`
  - [ ] `do_items`
  - [ ] `audit_log`
  - [ ] `files`
- [ ] `current_warehouse_id()` function deployed and working
- [ ] Each table has correct policies per database.md

### Audit Log Hardening
- [ ] `audit_log` UPDATE revoked from `authenticated` role
- [ ] `audit_log` DELETE revoked from `authenticated` role
- [ ] Only INSERT allowed for authenticated users (append-only)

### Role-Based Access
- [ ] `anon` role has NO access to any business table
- [ ] `authenticated` role: SELECT on views, ALL on business tables (subject to RLS)
- [ ] `service_role` used only in server-side code (backend API routes)

### Manual Cross-Tenant Tests
- [ ] Warehouse A staff SELECT → zero rows from Warehouse B
- [ ] Warehouse A staff INSERT with Warehouse B warehouse_id → rejected by RLS
- [ ] Admin in WH-A cannot see WH-B data

### Connection Pooling
- [ ] Supavisor enabled for serverless (replaces PgBouncer)
- [ ] Connection limit documented per project tier

### PITR (Point-in-time Recovery)
- [ ] Enabled on Pro plan (30-day retention)
- [ ] Tested restore to specific timestamp in staging
- [ ] Recovery procedure documented

### Performance
- [ ] Indexes exist for all query patterns
- [ ] `EXPLAIN ANALYZE` run on key queries (DO list, dashboard)
- [ ] No full table scans on hot paths

### Sign-off
- Engineer: ________________
- Date: ________________
- Staging parity confirmed: Yes / No
