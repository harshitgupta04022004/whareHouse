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
