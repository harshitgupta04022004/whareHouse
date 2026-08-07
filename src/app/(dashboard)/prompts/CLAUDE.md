# Dashboard Feature Prompts

Prompts for building dashboard pages in the `(dashboard)` route group.

## Files in This Directory
1. `03-delivery-order-list-filters.md` — DO list with date filters, pagination, summary cards
2. `04-create-edit-delivery-order-form.md` — DO create/edit form with dynamic item rows
3. `05-items-parties-master-data-ui.md` — Items and parties management
4. `06-admin-inventory-dashboard.md` — Admin dashboard with inventory statistics
5. `07-user-management-admin-ui.md` — User management (invite, roles, warehouse deletion)
6. `08-audit-log-viewer.md` — Audit log viewer with filters and export

## Context
These prompts build on:
- Dashboard layout with auth guard (parent: `../layout.tsx`)
- Store utilities (`../../lib/store.ts`, `../../lib/utils.ts`)
- Backend APIs (`../../api/prompts/`)
- Database schema (`../../database/prompts/`)

## Design References
- Tables: [MDN HTML Tables](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table)
- Forms: [MDN Form Controls](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms)
- Colors: [Color Hunt](https://colorhunt.co/)


---

# Imported Prompts

## 03-delivery-order-list-filters.md

# Prompt 03 — Delivery Order List, Filters & Pagination UI

## Role
Frontend engineer implementing the primary operational screen: browsing Delivery Orders (DOs).

## Problem Statement
Scale target: ~1000 DOs/month, 200+/day. The list UI must remain fast and respect role visibility.

### Table Columns
| Column | Source | Notes |
|--------|--------|-------|
| DO Number | `do_number` | Manual string (e.g. "DO-001", "1234/25-26") |
| Date | `date` | Formatted as DD/MM/YYYY (Indian format) |
| Direction | `direction` | IN = goods arriving (भीतर आना), OUT = goods leaving (बाहर जाना) |
| Party | `party_name` | From joined parties table, nullable |
| Items | `item_count` | Trigger-maintained count (display only) |
| Created By | `creator_name` | From joined app_users table |
| Updated | `updated_at` | Relative time (e.g. "2 hours ago") |

### Filters
- **Date range:** startDate + endDate inputs
- **Direction:** toggle IN / OUT / All
- **Party:** dropdown populated from parties table
- **Text search:** search do_number (debounced 300ms)
- **User filter:** admin/manager only — filter by creator

### Staff Visibility
- Staff sees ONLY own DOs (enforced server-side in `backend/03`)
- Admin/manager sees all warehouse DOs
- User filter dropdown only shown to admin/manager

### Pagination
- Cursor-based "Load more" button (not infinite scroll — better for warehouse floor use)
- Default 20 items per page
- URL params reflect filters (shareable links)

### Empty/Loading/Error States
- Loading: table row skeletons (5 rows)
- Empty: "No delivery orders match your filters."
- Error: "Failed to load delivery orders. Please try again."

### Visual Decisions
- IN badges: mist accent (`#A5C9CA`)
- OUT badges: rust accent (`#C84B31`)
- Dense table, native `<table>` for accessibility
- Direction shown in Hindi + English: "IN (भीतर)" / "OUT (बाहर)"

## Connections
- API: `backend/03` (list DOs endpoint)
- Schema: `delivery_orders` + `idx_do_warehouse_date`
- DO detail/create: `frontend/04`
- Tests: `testing/03` filter + RLS cases

## Acceptance Criteria
- [ ] Filter changes debounce 300ms and abort in-flight requests
- [ ] URL params reflect filters (shareable)
- [ ] Staff only sees own DOs
- [ ] Direction shows Hindi labels
- [ ] item_count is display-only (never edited)


---

## 04-create-edit-delivery-order-form.md

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


---

## 05-items-parties-master-data-ui.md

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


---

## 06-admin-inventory-dashboard.md

# Prompt 06 — Admin Inventory Dashboard (IN/OUT Matrix)

## Role
Frontend engineer for the admin/manager dashboard defined in `database.md` § Admin Dashboard.

## Problem Statement
Date-range matrix:
| Product | IN (range) | OUT (range) | Remaining (all time) | Remaining Bags |
Remaining bags = remaining / bag_size. IN/OUT filtered by DO `date`; remaining from `product_summary` all-time.

Build:
- Date range picker (`startDate`, `endDate`) with presets (7d, 30d, MTD)
- Sortable table; export CSV client-side via [Blob + download](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
- Print stylesheet for warehouse wall printouts
- Empty products still listed with zeros

## Visual Decisions
- One job section: “Inventory movement”. Large readable numbers.
- Positive remaining vs zero/negative: distinct ink colors from [Color Hunt](https://colorhunt.co/) — avoid red/green-only (add icons/text for colorblind users) per [MDN a11y](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG).

## Connections
- SQL/aggregation: `backend/06` + `database/06` views
- RBAC: staff must not access this route
- Caching strategy from `database.md` Browser Caching — short TTL for dashboard API

## Acceptance Criteria
- [ ] Matches calculation logic in database.md exactly
- [ ] Loading skeleton; error retry
- [ ] Date params in URL


---

## 07-user-management-admin-ui.md

# Prompt 07 — Admin User Management & Warehouse Deletion UI

## Role
Frontend for admin-only operations: user management + warehouse soft delete/recovery.

## Problem Statement

### User Management (from database.md § Admin Features)
Admin actions within their warehouse:
1. **Add User** — Invite: email, name, role (admin/manager/staff)
2. **Remove User** — Confirm with typed email before removing
3. **Update User** — Change role or name
4. **View All User Work** — Link to filtered DO list for that user

### Warehouse Deletion (from database.md § Warehouse Deletion Safety Protocol)
Admin can soft-delete their warehouse:
1. **Confirmation Dialog** — Admin must type the warehouse name exactly to confirm
2. **Soft Delete** — `is_deleted = true`, data preserved 30 days
3. **Recovery Window** — Show list of soft-deleted warehouses with "Restore" button
4. **Permanent Delete** — After 30 days, automatically purged

### Warehouse Settings Page
- View warehouse name (read-only for non-owners)
- Manage parties (add/edit/delete)
- Set bag_size per product
- Soft delete warehouse (admin only, with typed confirmation)
- Restore soft-deleted warehouse (within 30 days)

### UI Components
- User list table: name, email, role, created_at, actions
- Add user modal: email, name, role dropdown
- Remove confirmation: "Type the user's email to confirm removal"
- Warehouse delete: "Type the warehouse name to confirm deletion: [input]"
- Recovery list: warehouse name, deleted date, days remaining, Restore button

### RBAC Enforcement
- Only admin can access this page
- Manager and staff see 403 or hidden nav link
- Cannot manage users in other warehouses (RLS + RBAC)

## Connections
- Backend user management (`backend/07`)
- Backend warehouse soft delete (part of `backend/05` or new)
- Audit logs: `add_user`, `remove_user`, `update_user`
- DO list filtered by user (`backend/03` with userId param)

## Acceptance Criteria
- [ ] Admin can add/edit/remove users
- [ ] Typed-email confirmation required for remove
- [ ] Typed-warehouse-name confirmation required for delete
- [ ] Soft-deleted warehouses shown in recovery list
- [ ] Restore button works within 30-day window
- [ ] Non-admins cannot access


---

## 08-audit-log-viewer.md

# Prompt 08 — Audit Log Viewer UI

## Role
Build a read-only audit explorer for admins/managers (staff: own actions only).

## Problem Statement
`audit_log` is append-only with JSONB `old_data`/`new_data`, hash chain, IP, UA, session_id, request_id.
UI needs:
- Filters: date, entity, action, user
- Expandable row diffs (before/after) — render JSON as readable key/value diff
- Integrity check button calling backend verification API
- Never offer edit/delete controls

Use semantic `<details>`/`<summary>` or accessible accordion ([MDN details](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details)).

## Connections
- `database/07` hash triggers; `backend/08` integrity endpoint
- Login/logout from auth flows appear here

## Acceptance Criteria
- [ ] Diff highlights changed keys only
- [ ] Pagination for high-volume logs
- [ ] Integrity failure shows clear warning banner


---

