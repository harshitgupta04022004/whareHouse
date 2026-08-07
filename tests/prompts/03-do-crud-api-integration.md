# Prompt 03 — Delivery Order CRUD API Integration Tests

## Role
Backend test engineer covering atomic DO operations.

## Problem Statement
Tests for create/update/delete DO + lines:
- Happy path multi-item create → item_count matches trigger
- Duplicate do_number → 409/400 mapped message
- Invalid date (future) rejected
- Weight mismatch (client sends wrong total_weight) corrected or rejected
- Rollback when one line has invalid item_id
- Pagination cursor stability when inserting mid-list

## Connections
- `backend/04`, `database/05` triggers, frontend form contracts
- Use [MDN Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) in Node test client or supabase-js

## Acceptance Criteria
- [ ] Coverage report threshold for DO service module (≥80%)
- [ ] Parallel-safe tests (unique do_numbers per run)
