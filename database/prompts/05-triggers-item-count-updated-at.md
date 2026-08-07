# Prompt 05 — Triggers: item_count Sync & updated_at

## Role
Database engineer implementing trigger-maintained derived fields.

## Problem Statement
Two trigger functions from database.md:

### 1. sync_do_item_count()
```sql
create or replace function sync_do_item_count() returns trigger as $$
begin
  update delivery_orders
  set item_count = (
    select count(*) from do_items where do_id = coalesce(new.do_id, old.do_id)
  ),
  updated_at = now()
  where do_id = coalesce(new.do_id, old.do_id);
  return null;
end;
$$ language plpgsql;

create trigger trg_do_items_count
after insert or update or delete on do_items
for each row execute function sync_do_item_count();
```

**Behavior:**
- Fires AFTER INSERT, UPDATE, or DELETE on `do_items`
- Recalculates `item_count` for the parent `delivery_orders` row
- The app MUST NEVER write `item_count` directly — always computed
- `coalesce(new.do_id, old.do_id)` handles both INSERT (new) and DELETE (old)

### 2. set_updated_at()
```sql
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
```
Applied to: warehouses, app_users, items, delivery_orders (BEFORE UPDATE).

### Why Triggers
- `item_count` stored for fast reads (avoids COUNT on every DO list query)
- Trigger keeps it in sync automatically — no app drift
- `updated_at` auto-maintained — no manual setting needed

## Connections
- Backend must NOT write `item_count` (prompts backend/04)
- Frontend displays `item_count` from DO list (prompt frontend/03)
- Views (`product_summary`) are computed live, not trigger-maintained — different approach

## Acceptance Criteria
- [ ] Inserting a DO item increments parent `item_count`
- [ ] Deleting all DO items sets `item_count` to 0
- [ ] Updating `updated_at` via patch triggers the before-update trigger
- [ ] App never writes `item_count` directly (enforced via code review or lint)
