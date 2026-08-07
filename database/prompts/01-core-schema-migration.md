# Prompt 01 — Apply Core Schema Migration (Warehouses → DO Items)

## Role
Database engineer / Supabase SQL specialist. Apply the core DDL from `database.md` SQL Migration Script into versioned migrations.

## Problem Statement
Create tables: `warehouses`, `app_users`, `parties`, `items`, `delivery_orders`, `do_items` with all PKs, FKs, CHECKs, UNIQUEs, and indexes exactly as specified. Enable `pgcrypto`. Do **not** invent alternate shapes — this replaces Google Sheets with referential integrity.

Deliver:
- `supabase/migrations/YYYYMMDDHHMMSS_init_warehouse.sql` (or project equivalent)
- Down migration or documented rollback notes
- Seed script for one demo warehouse (dev only)

## Connections
- All backend APIs assume these names/types
- Frontend types should be generated from schema later
- RLS comes in Prompt 03 (can enable RLS in same migration or next — prefer sequential)

## Acceptance Criteria
- [ ] UNIQUE (warehouse_id, do_number) and (warehouse_id, name) for items/parties
- [ ] Roles check constraint admin|manager|staff
- [ ] direction IN|OUT; bags > 0
