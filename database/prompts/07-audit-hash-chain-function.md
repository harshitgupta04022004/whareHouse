# Prompt 07 — Audit Hash Chain DB Function (Optional Complement)

## Role
Database engineer providing a Postgres function to verify the audit hash chain integrity.

## Problem Statement
The audit log uses a hash chain for tamper detection. Each row's `current_hash` is SHA-256 of: `timestamp + user_id + action + entity_id + old_data + new_data`. The `previous_hash` points to the prior row's hash.

### Verification Function
```sql
create or replace function verify_audit_integrity(p_warehouse_id uuid)
returns table(ok boolean, broken_at bigint, message text) as $$
declare
  prev_hash text := null;
  rec record;
begin
  for rec in
    select log_id, previous_hash, current_hash, "timestamp"
    from audit_log
    where warehouse_id = p_warehouse_id
    order by "timestamp" asc, log_id asc
  loop
    if rec.previous_hash is distinct from prev_hash then
      ok := false;
      broken_at := rec.log_id;
      message := format('Chain broken at log_id %s: expected previous_hash=%s, got %s',
                         rec.log_id, prev_hash, rec.previous_hash);
      return next;
      return;
    end if;
    prev_hash := rec.current_hash;
  end loop;

  ok := true;
  broken_at := null;
  message := 'Chain intact';
  return next;
end;
$$ language plpgsql;
```

### Canonical Hash Input
To verify, recompute each row's hash using the same input formula:
```sql
encode(
  sha256(
    (COALESCE("timestamp"::text,'') || COALESCE(user_id::text,'') ||
     COALESCE(action,'') || COALESCE(entity_id::text,'') ||
     COALESCE(old_data::text,'') || COALESCE(new_data::text,''))::bytea
  ),
'hex')
```
Compare with `current_hash`. Mismatch = tampering.

## Connections
- Backend integrity API (`backend/08`) calls this function
- Admin audit UI (`frontend/08`) has "Verify Integrity" button
- Testing Prompt 06 tests tamper detection

## Acceptance Criteria
- [ ] Function runs without error for a warehouse with audit rows
- [ ] Returns `ok=true` for unmodified chain
- [ ] Returns `ok=false, broken_at=N` when a row's `previous_hash` is altered
