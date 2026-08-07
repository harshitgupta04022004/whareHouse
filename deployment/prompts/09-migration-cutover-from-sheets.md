# Prompt 09 — Google Sheets → Supabase Cutover Runbook

## Role
Write and automate the production cutover from the legacy Google Sheets model to WareHouse.

## Problem Statement
database.md was written to replace Google Sheets. The cutover must be safe and reversible.

### Pre-Cutover
1. **Data Export from Sheets:** Export all warehouses, users, items, parties, DOs, do_items from existing Google Sheets
2. **Data Cleansing:** Remove duplicates, fix date formats, validate DO numbers
3. **Schema Migration:** Run all database prompts (01–10) on production Supabase
4. **Import Data:** Load cleansed data into Supabase tables
5. **Verify Counts:** Row counts match between Sheets and Supabase
6. **Preserve Legacy References:** Keep `spreadsheet_id` and `drive_folder_id` on warehouses for dual-run period

### Dual-Run Period (T+0 to T+72h)
- App writes to Supabase (primary)
- Sheets kept in read-only mode (backup reference)
- Monitor for data discrepancies
- Users can report issues

### Cutover (T+72h)
- Freeze Sheets permanently (read-only for all users)
- App becomes sole source of truth
- Remove legacy `spreadsheet_id`/`drive_folder_id` columns (database/01 migration)

### Rollback (if critical defect in T+24h)
- Re-enable Sheets writes
- Export new data from Supabase back to Sheets
- Revert app to Sheets API (previous codebase)
- Communicate to users

### Communication Templates
- Pre-cutover: "We're upgrading to a new system on [date]. Your data will be preserved."
- Cutover day: "The new system is live. Please use [app URL] instead of Sheets."
- Post-cutover: "Legacy Sheets access has been retired. All data is in the new system."

### Validation Queries
```sql
-- Verify DO counts match
SELECT count(*) FROM delivery_orders WHERE warehouse_id = '...';

-- Verify item totals match
SELECT * FROM product_summary WHERE warehouse_id = '...';

-- Verify audit log has import entries
SELECT count(*) FROM audit_log WHERE action = 'import';
```

## Connections
- Schema migrations (database/01–10)
- Data import uses backend APIs or direct SQL
- Drive folder structure preserved (`database/08`)
- Legacy `spreadsheet_id` on warehouses

## Acceptance Criteria
- [ ] Dry-run on staging with production-scale data
- [ ] Row count reconciliation report
- [ ] Rollback procedure tested
- [ ] Communication templates ready
