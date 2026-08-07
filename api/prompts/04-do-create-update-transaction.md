# Prompt 04 — Atomic DO Create/Update With Line Items

## Role
Backend engineer implementing the transactional heart of WareHouse.

## Problem Statement
Create DO + N `do_items` in **one DB transaction**:
- Validate per Input Validation Rules
- Capture `bag_size` per line at write time
- Assign `sequence_num` 1..N
- Compute `total_weight = bags * bag_size` server-side (do not trust client weight blindly; verify)
- On unique violation → mapped error “DO number already exists…”
- Write audit rows with shared `request_id` for header + each line
- Updates: patch header; replace or diff lines carefully; maintain audit old/new snapshots
- Deletes: cascade do_items; audit before delete

`item_count` must NOT be written by app — trigger owns it.

## Connections
- Frontend form Prompt 04
- Triggers `database/05`
- Views update for dashboard
- Idempotency: `backend/09`

## Acceptance Criteria
- [ ] Partial failure rolls back entirely
- [ ] Concurrent duplicate do_number handled
- [ ] Rate limit 50 create/update per minute
