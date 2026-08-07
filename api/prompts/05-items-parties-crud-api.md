# Prompt 05 — Items & Parties CRUD API

## Role
CRUD APIs for master data with warehouse scoping and FK-safe deletes.

## Problem Statement
- POST/PATCH/DELETE items & parties
- UNIQUE (warehouse_id, name) → friendly errors
- DELETE item blocked if referenced (`ON DELETE RESTRICT`) → “Item in use by delivery orders”
- GET items includes optional join to `item_totals` / `product_summary`
- Audit create/update/delete; bag_size change → `set_bag_size`

## Connections
- Frontend Prompt 05
- DO lines reference items
- RLS policies on both tables

## Acceptance Criteria
- [ ] warehouse_id always from session
- [ ] Pagination on list endpoints
