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
