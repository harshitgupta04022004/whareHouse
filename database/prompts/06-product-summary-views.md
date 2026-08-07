# Prompt 06 — Views: product_summary & item_totals

## Role
Database engineer creating live computed views (NOT materialized — always fresh).

## Problem Statement
Views compute derived data on every SELECT. Nothing stored, nothing stale.

### View: product_summary
```sql
create view product_summary as
select
  i.item_id,
  i.warehouse_id,
  i.name as product,
  i.bag_size,
  coalesce(sum(di.total_weight) filter (where do_.direction = 'IN'), 0)  as total_in,
  coalesce(sum(di.total_weight) filter (where do_.direction = 'OUT'), 0) as total_out,
  coalesce(sum(di.total_weight) filter (where do_.direction = 'IN'), 0)
    - coalesce(sum(di.total_weight) filter (where do_.direction = 'OUT'), 0) as remaining
from items i
left join do_items di on di.item_id = i.item_id
left join delivery_orders do_ on do_.do_id = di.do_id
group by i.item_id, i.warehouse_id, i.name, i.bag_size;
```

**Columns:** item_id, warehouse_id, product, bag_size, total_in, total_out, remaining
- `total_in` = SUM weight where direction = IN
- `total_out` = SUM weight where direction = OUT
- `remaining` = total_in - total_out (all-time, not date-filtered)

### View: item_totals
```sql
create view item_totals as
select
  i.item_id,
  i.warehouse_id,
  coalesce(sum(di.total_weight), 0) as total_weight
from items i
left join do_items di on di.item_id = i.item_id
group by i.item_id, i.warehouse_id;
```

**Columns:** item_id, warehouse_id, total_weight

### Grant Access
```sql
grant select on product_summary to authenticated;
grant select on item_totals to authenticated;
```

## Important: Date Range Filtering
The `product_summary` view is ALL-TIME. Date range filtering (for the admin dashboard) happens in the backend SQL query, NOT in the view. The dashboard API filters by DO date BETWEEN startDate AND endDate for IN/OUT columns, but remaining is always all-time.

## Connections
- Dashboard API (`backend/06`) queries these views
- Items page (`frontend/05`) shows remaining weight from product_summary
- Dashboard UI (`frontend/06`) displays the matrix
- Golden tests (`testing/07`) verify math

## Acceptance Criteria
- [ ] Views create without errors
- [ ] INSERT into do_items → product_summary updates immediately (no refresh needed)
- [ ] New items with zero transactions show total_in=0, total_out=0, remaining=0
- [ ] Grants allow authenticated role to SELECT
- [ ] Data consistency verified: INSERT → view update is immediate (no materialized refresh needed)
- [ ] Consistency verification: views always reflect current underlying table state
