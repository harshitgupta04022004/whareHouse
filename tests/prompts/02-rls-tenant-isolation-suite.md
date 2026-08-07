# Prompt 02 — Automated RLS / Tenant Isolation Test Suite

## Role
Security-focused test engineer. Prove Warehouse A cannot read Warehouse B.

## Problem Statement
Create integration tests (pgTAP, Jest+supabase-js, or SQL scripts) that:
1. Seed two warehouses, users, DOs, items, audit rows
2. Authenticate as WH-A staff → assert zero rows from WH-B for every table
3. Attempt INSERT into WH-B UUID → rejected by RLS WITH CHECK
4. Staff cannot SELECT another user’s DOs in same warehouse
5. Admin in WH-A still cannot see WH-B

This is the **most critical** test suite for the product’s isolation promise in `database.md`.

## Connections
- `database/03` RLS policies
- `backend/02` RBAC
- Must run on every PR (Prompt 05)

## Acceptance Criteria
- [ ] Fails CI if any cross-tenant leak
- [ ] Documented how to add new tables to the suite
