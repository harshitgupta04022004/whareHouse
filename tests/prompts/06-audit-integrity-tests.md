# Prompt 06 — Audit Hash Chain & Append-Only Tests

## Role
Verify that the audit log is truly tamper-proof and append-only.

## Problem Statement
Test every integrity mechanism from database.md § Audit Integrity:

### 1. Append-Only Enforcement
- As authenticated role: INSERT succeeds ✅
- As authenticated role: UPDATE fails ❌ (revoked)
- As authenticated role: DELETE fails ❌ (revoked)
- Test both via Supabase client and raw SQL

### 2. Hash Chain Validation
- Insert sequence of 5 audit rows
- Call `verify_audit_integrity(warehouse_id)` → returns ok=true
- Tamper with row 3's `current_hash` (requires service role)
- Re-verify → returns ok=false, broken_at=3

### 3. Full State Snapshots
- Create a DO → audit row has `old_data=null`, `new_data=full_row`
- Update DO direction → audit row has both `old_data` and `new_data`
- Delete DO → audit row has `old_data=full_row`, `new_data=null`
- Verify JSONB contents match actual row values

### 4. RLS Audit Isolation
- Warehouse A inserts audit row
- Warehouse B authenticates → cannot SELECT Warehouse A's audit rows
- Warehouse B attempts INSERT with Warehouse A's warehouse_id → blocked by WITH CHECK

### 5. Hash Chain Correctness
- Recompute hash using canonical formula: SHA256(timestamp + user_id + action + entity_id + old_data + new_data)
- Compare with stored `current_hash`
- Mismatch = test failure

## Connections
- `database/04` (audit table), `database/07` (verify function)
- `backend/08` (audit writer + integrity API)
- `frontend/08` (audit viewer with verify button)

## Acceptance Criteria
- [ ] All 5 test categories pass
- [ ] Tamper detection is deterministic
- [ ] Tests run in CI without flaking (no timing dependencies)
