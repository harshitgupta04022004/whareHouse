# Prompt 03 — Row Level Security Policies (Warehouse Isolation)

## Role
Database engineer implementing RLS as the security backbone of WareHouse.

## Problem Statement
RLS enforces warehouse isolation at the Postgres level — even if application code has bugs, users cannot see data from other warehouses. This is the most critical security feature.

### Helper Function
```sql
create or replace function current_warehouse_id() returns uuid as $$
  select warehouse_id from app_users where user_id = auth.uid();
$$ language sql stable security definer;
```
This function is called by every RLS policy. It is `SECURITY DEFINER` so it runs with owner privileges (bypasses RLS on app_users to resolve the caller's warehouse).

### Policies to Create (per database.md)

| Table | Policy Name | Operation | Rule |
|-------|-------------|-----------|------|
| warehouses | own warehouse only | SELECT | `warehouse_id = current_warehouse_id()` |
| app_users | own warehouse only | SELECT | `warehouse_id = current_warehouse_id()` |
| parties | own warehouse only | ALL | `USING + WITH CHECK` on warehouse_id |
| items | own warehouse only | ALL | `USING + WITH CHECK` on warehouse_id |
| delivery_orders | own warehouse only | ALL | `USING + WITH CHECK` on warehouse_id |
| do_items | own warehouse only | ALL | `EXISTS (SELECT 1 FROM delivery_orders WHERE do_id = do_items.do_id AND warehouse_id = current_warehouse_id())` |
| audit_log | read own warehouse | SELECT | `warehouse_id = current_warehouse_id()` |
| audit_log | insert own warehouse | INSERT | `warehouse_id = current_warehouse_id()` |

### Critical: Audit Log Hardening
```sql
revoke update, delete on audit_log from authenticated;
```
This means even a compromised service key cannot UPDATE or DELETE audit entries. Only INSERT is allowed.

### do_items Special Case
`do_items` has no `warehouse_id` column. The policy joins through the parent `delivery_orders` table to check warehouse ownership. This is slower but correct.

### Staff-Level Restriction (Application Layer)
RLS alone does not restrict staff from seeing other users' DOs in the same warehouse. That restriction is RBAC at the application layer (`backend/02`). RLS only prevents cross-warehouse access.

## Connections
- Backend must use `current_warehouse_id()` or rely on RLS — never pass `warehouse_id` from client
- Testing Prompt 02 proves cross-tenant isolation works
- Production Prompt 06 reviews RLS in production before launch
- Backend RBAC (`backend/02`) adds per-user restrictions on top of RLS

## Acceptance Criteria
- [ ] All 7 tables have RLS enabled
- [ ] `current_warehouse_id()` works for authenticated users
- [ ] Cross-warehouse SELECT returns zero rows (tested)
- [ ] Cross-warehouse INSERT fails WITH CHECK (tested)
- [ ] `audit_log` UPDATE/DELETE revoked from authenticated role
- [ ] `do_items` policy correctly joins through `delivery_orders`
