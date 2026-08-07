# Prompt 05 — Items & Parties Master Data Screens

## Role
Frontend engineer for warehouse master data: `items` and `parties`.

## Problem Statement
Both tables are warehouse-scoped with UNIQUE `(warehouse_id, name)`.
- Items: name, bag_size (default 50). Show computed totals from `item_totals` / `product_summary` (read-only remaining weight).
- Parties: name only (suppliers/customers/drivers). Replaces free-text `tickerName`.
- Prevent delete when FK restrict would fail (item used in `do_items`) — show actionable error
- Inline create from DO form should deep-link or modal-reuse these components

## Visual Decisions
- Simple list + side panel editor (not card grids). Color Hunt paper/slate tokens.
- Numeric bag_size inputs: `inputmode="decimal"` per [MDN input modes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode).

## Connections
- Backend CRUD: `backend/05`
- DO form typeaheads depend on this data
- Admin bag_size changes audit as `set_bag_size`

## Acceptance Criteria
- [ ] Duplicate names blocked with warehouse-scoped message
- [ ] Staff can add items/parties per RBAC matrix
- [ ] Remaining stock never stored client-side as source of truth — always from views/API
