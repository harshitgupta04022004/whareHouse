# Database Prompts

Prompts for building the Supabase PostgreSQL schema, migrations, RLS policies, and triggers.

## Files in This Directory
1. `01-core-schema-migration.md` — Core DDL: all tables, PKs, FKs, CHECKs, indexes
2. `02-app-users-auth-link.md` — app_users table, auth.users linkage
3. `03-rls-policies-isolation.md` — RLS policies per table
4. `04-audit-log-append-only.md` — Audit log table, append-only constraints
5. `05-triggers-item-count-updated-at.md` — Triggers for item counts and timestamps
6. `06-product-summary-views.md` — Derived data views
7. `07-audit-hash-chain-function.md` — Hash chain verification
8. `08-files-table-drive-metadata.md` — Google Drive file metadata table
9. `09-soft-delete-warehouse-jobs.md` — Soft delete and purge jobs
10. `10-backup-exports-pit.md` — Backup strategy and point-in-time recovery

## Build Order
1. `01` (schema) -> `02` (auth link) -> `03` (RLS) -> `04` (audit) -> `05` (triggers) -> `06-10` (views, functions, jobs)

## Context
- Full schema SQL reference: `../database.md`
- API layer uses these tables: `../api/prompts/`
- Frontend queries via Supabase client: `../src/`


---

# Imported Prompts

## 01-core-schema-migration.md

# Prompt 01 — Apply Core Schema Migration (Warehouses → DO Items)

## Role
Database engineer / Supabase SQL specialist. Apply the core DDL from `database.md` SQL Migration Script into versioned migrations.

## Problem Statement
Create tables: `warehouses`, `app_users`, `parties`, `items`, `delivery_orders`, `do_items` with all PKs, FKs, CHECKs, UNIQUEs, and indexes exactly as specified. Enable `pgcrypto`. Do **not** invent alternate shapes — this replaces Google Sheets with referential integrity.

Deliver:
- `supabase/migrations/YYYYMMDDHHMMSS_init_warehouse.sql` (or project equivalent)
- Down migration or documented rollback notes
- Seed script for one demo warehouse (dev only)

## Connections
- All backend APIs assume these names/types
- Frontend types should be generated from schema later
- RLS comes in Prompt 03 (can enable RLS in same migration or next — prefer sequential)

## Acceptance Criteria
- [ ] UNIQUE (warehouse_id, do_number) and (warehouse_id, name) for items/parties
- [ ] Roles check constraint admin|manager|staff
- [ ] direction IN|OUT; bags > 0


---

## 02-app-users-auth-link.md

# Prompt 02 — app_users ↔ auth.users Linkage & Indexes

## Role
Database engineer. Harden the identity model that ties Supabase Auth to warehouse-scoped users.

## Problem Statement
`app_users.user_id` is both the Supabase Auth user id AND the warehouse-scoped identity. This prompt ensures the linkage is bulletproof.

Create and verify:
- **FK constraint:** `user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE` — when a Supabase Auth user is deleted, the `app_users` row cascades automatically. This is the only table with CASCADE to `auth.users`.
- **Index:** `idx_users_warehouse` on `warehouse_id` — speeds up `current_warehouse_id()` lookups
- **UNIQUE on email:** prevents duplicate accounts across warehouses (global uniqueness)
- **Trigger guard (optional but recommended):** prevent changing `warehouse_id` after initial insert — users can only belong to one warehouse at a time. If a user needs to move warehouses, delete and recreate.
- **Service role insert path:** when an admin invites a user, the insert into `app_users` uses the service role key (bypasses RLS). Document this clearly so the backend prompt knows how to call it.
- **RLS on app_users:** `SELECT` only with `warehouse_id = current_warehouse_id()` — staff cannot see other warehouses' users
- **FK to warehouses uses `ON DELETE RESTRICT`** — you cannot delete a warehouse while users still reference it. Users must be removed first (admin user management flow).

## Key Decisions
- `ON DELETE CASCADE` on auth.users means: if a Supabase Auth user is permanently deleted, their app_users row vanishes. This is intentional for cleanup.
- `ON DELETE RESTRICT` on warehouses means: warehouse deletion is blocked until all users are removed. This prevents orphaned users.
- Email is `UNIQUE` globally — no two users across all warehouses can share an email. This prevents confusion during invites.

## Connections
- Backend invite API: `backend/07` inserts via service role
- `current_warehouse_id()` function depends on this table having a row for every authenticated user
- Frontend shell reads role from this table for nav visibility
- RLS policies on every other table depend on `current_warehouse_id()` which queries this table

## Acceptance Criteria
- [ ] FK, indexes, UNIQUE constraints match the DDL in database.md exactly
- [ ] `ON DELETE CASCADE` to auth.users confirmed working (test: delete auth user → app_users row gone)
- [ ] `ON DELETE RESTRICT` to warehouses confirmed (test: try delete warehouse with users → blocked)
- [ ] Service role insert documented for backend invite flow


---

## 03-rls-policies-isolation.md

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


---

## 04-audit-log-append-only.md

# Prompt 04 — audit_log Table, Grants & Indexes

## Role
Create append-only `audit_log` with JSONB snapshots and hash columns.

## Problem Statement
- Identity PK `log_id`
- Indexes: warehouse+ts, entity, user, session
- `REVOKE UPDATE, DELETE ON audit_log FROM authenticated` (and anon)
- RLS select/insert own warehouse only
- Comment columns for operators

## Connections
- Backend audit writer
- Frontend audit viewer
- Backup exports daily CSV

## Acceptance Criteria
- [ ] Update/delete as authenticated fails
- [ ] Insert works with valid warehouse_id


---

## 05-triggers-item-count-updated-at.md

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


---

## 06-product-summary-views.md

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


---

## 07-audit-hash-chain-function.md

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


---

## 08-files-table-drive-metadata.md

# Prompt 08 — files Table for Google Drive Metadata + RLS

## Role
Database engineer creating the `files` table with RLS, indexes, and constraints.

## Problem Statement
The `files` table tracks metadata for all files stored in Google Drive. The actual binary lives in Drive; this table is for search, audit, and relationship tracking.

### DDL
```sql
create table files (
  file_id       uuid primary key default gen_random_uuid(),
  warehouse_id  uuid not null references warehouses(warehouse_id) on delete cascade,
  user_id       uuid references app_users(user_id) on delete set null,
  do_id         uuid references delivery_orders(do_id) on delete set null,
  file_name     text not null,
  file_type     text not null,
  file_size     bigint not null,
  drive_file_id text not null,
  drive_url     text not null,
  folder_path   text not null,
  category      text not null check (category in (
    'document','report','do_pdf','template','rate_list','contact','backup','other'
  )),
  description   text,
  created_at    timestamptz not null default now()
);
```

### Indexes
- `idx_files_warehouse` on warehouse_id
- `idx_files_do` on do_id
- `idx_files_user` on user_id
- `idx_files_category` on (warehouse_id, category)

### RLS Policies
```sql
alter table files enable row level security;

create policy "own warehouse only" on files
  for all using (warehouse_id = current_warehouse_id())
  with check (warehouse_id = current_warehouse_id());
```

### Constraints
- `category` CHECK constraint prevents invalid folder placement
- FK to `delivery_orders` uses `ON DELETE SET NULL` — when a DO is deleted, the file metadata remains (file stays in Drive)
- FK to `app_users` uses `ON DELETE SET NULL` — same pattern

### Category → Drive Folder Mapping
| Category | Drive Path |
|----------|-----------|
| document | Documents/{user}/{do_number}/ |
| report | Reports/{type}/ |
| do_pdf | DOs/ |
| template | Shared/Templates/ |
| rate_list | Shared/Rate Lists/ |
| contact | Shared/Contacts/ |
| backup | Backups/ |
| other | Documents/{user}/ |

## Connections
- Backend Drive API (`backend/10`) inserts rows here
- Frontend upload UI (`frontend/10`) reads from here
- Testing Prompt 09 mocks this table
- Production Prompt 03 secures Drive SA

## Acceptance Criteria
- [ ] All 8 categories enforced by CHECK constraint
- [ ] RLS prevents cross-warehouse file listing
- [ ] Deleting a DO sets do_id to null (not cascade delete file metadata)
- [ ] Indexes support warehouse+category queries efficiently


---

## 09-soft-delete-warehouse-jobs.md

# Prompt 09 — Warehouse Soft Delete & 30-Day Purge Job

## Role
Database engineer implementing the warehouse deletion safety protocol from database.md.

## Problem Statement
database.md defines a 4-step warehouse deletion protocol:

### Deletion Protocol
1. **Step 1: Confirmation Dialog** — Admin must type warehouse name to confirm
2. **Step 2: Soft Delete** — Warehouse marked as `is_deleted = true`, data preserved for 30 days
3. **Step 3: Recovery Window** — Admin can restore warehouse within 30 days
4. **Step 4: Permanent Delete** — After 30 days, data permanently removed

### Soft Delete Implementation
```sql
-- Soft delete (admin action)
UPDATE warehouses SET is_deleted = true WHERE warehouse_id = '...';

-- Recovery (within 30 days)
UPDATE warehouses SET is_deleted = false WHERE warehouse_id = '...';

-- Check if recoverable
SELECT warehouse_id, name, updated_at,
  now() - updated_at as deleted_ago
FROM warehouses
WHERE is_deleted = true
  AND now() - updated_at < interval '30 days';
```

### Purge Job (Supabase Edge Function or pg_cron)
```sql
-- Permanent delete after 30 days
-- Must remove users first (RESTRICT on app_users)
DELETE FROM app_users WHERE warehouse_id IN (
  SELECT warehouse_id FROM warehouses
  WHERE is_deleted = true
    AND now() - updated_at > interval '30 days'
);

DELETE FROM warehouses WHERE is_deleted = true
  AND now() - updated_at > interval '30 days';
```

### Audit Logging
- Soft delete → audit action: `delete` with entity `warehouse`
- Recovery → audit action: `recover_data` with entity `warehouse`
- Permanent delete → audit action: `delete` with entity `warehouse` (final)

### FK Cascade Order
Deleting a warehouse cascades to:
1. `parties` (CASCADE)
2. `items` (CASCADE)
3. `delivery_orders` → `do_items` (CASCADE chain)
4. `audit_log` (RESTRICT — must handle separately or use restrict carefully)
5. `files` (CASCADE)
6. `app_users` (RESTRICT — must remove first)

### Dry-Run Mode
The purge job should support dry-run: list warehouses that WOULD be deleted without actually deleting.

## Connections
- Admin UI soft delete (`frontend/07`) shows confirmation dialog
- Recovery UI (`frontend/07`) shows recoverable warehouses
- Audit logging (`backend/08`)
- Backup before purge (`database/10`)

## Acceptance Criteria
- [ ] Soft delete sets `is_deleted = true`
- [ ] Recovery within 30 days works
- [ ] Purge job removes warehouses deleted > 30 days ago
- [ ] Purge respects FK order (users first)
- [ ] Dry-run mode lists affected warehouses
- [ ] All actions logged to audit_log


---

## 10-backup-exports-pit.md

# Prompt 10 — Backup Export Scripts & PITR Checklist

## Role
Operational database reliability per Backup & Recovery Strategy.

## Problem Statement
- Weekly full export script to Storage/S3/Drive Backups folder
- Daily audit_log CSV export
- Document Supabase PITR settings
- Disaster recovery runbook markdown in repo `docs/dr.md`
- Pre-bulk-operation snapshot helper

## Connections
- Production monitoring Prompt 08
- Drive Backups path in folder structure
- Testing restore drill Prompt 10

## Acceptance Criteria
- [ ] Script runnable in CI dry-run
- [ ] Checklist matches database.md Disaster Recovery Checklist


---

