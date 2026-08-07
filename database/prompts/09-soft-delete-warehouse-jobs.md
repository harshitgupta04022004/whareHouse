# Prompt 09 — Warehouse Soft Delete & 30-Day Purge Job

## Role
Database engineer implementing the warehouse deletion safety protocol from database.md.

## Problem Statement
database.md defines a 4-step warehouse deletion protocol:

### Deletion Protocol
1. **Step 1: Confirmation Dialog** — Admin must type warehouse name to confirm
2. **Step 2: Soft Delete** — Warehouse marked as `is_deleted = true`, data preserved for 30 days
3. **Step 3: Recovery Window** — Admin can restore warehouse within 30 days
4. **Step 4: Permanent Delete** — After 30 days, data permanently removed

### Soft Delete Implementation
```sql
-- Soft delete (admin action)
UPDATE warehouses SET is_deleted = true WHERE warehouse_id = '...';

-- Recovery (within 30 days)
UPDATE warehouses SET is_deleted = false WHERE warehouse_id = '...';

-- Check if recoverable
SELECT warehouse_id, name, updated_at,
  now() - updated_at as deleted_ago
FROM warehouses
WHERE is_deleted = true
  AND now() - updated_at < interval '30 days';
```

### Purge Job (Supabase Edge Function or pg_cron)
```sql
-- Permanent delete after 30 days
-- Must remove users first (RESTRICT on app_users)
DELETE FROM app_users WHERE warehouse_id IN (
  SELECT warehouse_id FROM warehouses
  WHERE is_deleted = true
    AND now() - updated_at > interval '30 days'
);

DELETE FROM warehouses WHERE is_deleted = true
  AND now() - updated_at > interval '30 days';
```

### Audit Logging
- Soft delete → audit action: `delete` with entity `warehouse`
- Recovery → audit action: `recover_data` with entity `warehouse`
- Permanent delete → audit action: `delete` with entity `warehouse` (final)

### FK Cascade Order
Deleting a warehouse cascades to:
1. `parties` (CASCADE)
2. `items` (CASCADE)
3. `delivery_orders` → `do_items` (CASCADE chain)
4. `audit_log` (RESTRICT — must handle separately or use restrict carefully)
5. `files` (CASCADE)
6. `app_users` (RESTRICT — must remove first)

### Dry-Run Mode
The purge job should support dry-run: list warehouses that WOULD be deleted without actually deleting.

## Connections
- Admin UI soft delete (`frontend/07`) shows confirmation dialog
- Recovery UI (`frontend/07`) shows recoverable warehouses
- Audit logging (`backend/08`)
- Backup before purge (`database/10`)

## Acceptance Criteria
- [ ] Soft delete sets `is_deleted = true`
- [ ] Recovery within 30 days works
- [ ] Purge job removes warehouses deleted > 30 days ago
- [ ] Purge respects FK order (users first)
- [ ] Dry-run mode lists affected warehouses
- [ ] All actions logged to audit_log
