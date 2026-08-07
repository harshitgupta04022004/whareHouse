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
