# Google Sheets to Supabase Cutover Runbook

## Overview
Safe, reversible migration from legacy Google Sheets to WareHouse web app.

## Phase 1: Pre-Cutover (T-7 days)

### Data Export
1. Export all data from Google Sheets:
   - Warehouses, Users, Items, Parties, DOs, do_items

### Data Cleansing
- Remove duplicates, fix date formats, validate DO numbers

### Schema Migration
- Run all database prompts (01-10) on production Supabase

### Import & Verify
- Import cleansed data via backend API or direct SQL
- Verify row counts match between Sheets and Supabase

## Phase 2: Dual-Run (T+0 to T+72h)
- App writes to Supabase (primary)
- Sheets kept in read-only mode (backup reference)
- Monitor for data discrepancies daily

## Phase 3: Cutover (T+72h)
1. Freeze Sheets permanently (read-only)
2. App becomes sole source of truth
3. Remove legacy spreadsheet_id/drive_folder_id columns

## Rollback (if critical defect in T+24h)
1. Re-enable Sheets writes
2. Export new data from Supabase back to Sheets
3. Revert app to Sheets API
4. Communicate to users

## Communication Templates
- Pre-cutover: "We're upgrading on [date]. Your data will be preserved."
- Cutover day: "The new system is live! Use [app URL] instead of Sheets."
- Post-cutover: "Legacy Sheets access retired. All data in new system."
