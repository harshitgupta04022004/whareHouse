# Prompt 04 — Create / Edit Delivery Order Form (Multi-Item)

## Role
Frontend engineer building the DO create/edit experience — the core replacement for Google Sheets row entry.

## Problem Statement
A DO has header fields + **many line items** (`do_items`):
- Header: `do_number` (manual string, warehouse-unique), `date`, `direction` IN|OUT, optional `party_id`
- Lines: `item_id`, `bags` (>0), `bag_size` captured at txn time, `total_weight` = bags × bag_size, `sequence_num`
- Validation mirrors `database.md` Input Validation Rules (date not future, not older than 365 days; bags ≤ 10000; etc.)
- Atomic submit: one request creates DO + all items; show field-level errors from API
- Duplicate DO number must surface the UNIQUE constraint message clearly
- Edit mode: admin/manager any DO; staff own only

Reference [MDN Constraint Validation API](https://developer.mozilla.org/en-US/docs/Web/HTML/Constraint_validation) for progressive enhancement; still validate on server.

## UX Details
- Add/remove line rows with keyboard (Tab order preserved)
- Autocomplete for items & parties (typeahead) — data from warehouse-scoped lists
- Show live weight total for the DO
- Confirm before navigating away with dirty form ([`beforeunload`](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event) sparingly)

## Connections
- Backend transaction: `backend/04`
- Triggers update `item_count`; UI should refresh after save
- Audit: create/update logged with old_data/new_data
- Product summary views update automatically — dashboard prompt consumes them

## Acceptance Criteria
- [ ] Cannot submit zero line items
- [ ] bag_size defaults from selected item but is snapshotted on each line
- [ ] Optimistic UI optional; must reconcile with server response
- [ ] Works offline-queued later via Prompt 09 (hook interface only)
