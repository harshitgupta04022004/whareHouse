# src/components/ — Shared React Components

Reusable UI components used across multiple routes. AuthProvider and Navbar are the core components.

## Key Files
- `AuthProvider.tsx` — React Context providing `user`, `loading`, `login`, `signup`, `logout`
- `Navbar.tsx` — Top navigation: logo, nav links (DOs, Items), user avatar, sign out button

## Current Implementation
### AuthProvider
- Wraps app in `AuthContext` with `useAuth()` hook
- Initializes user from localStorage on mount
- Provides `login(email, password)`, `signup(name, email, password)`, `logout()`
- Loading state prevents flash of unauthenticated content

### Navbar
- Sticky top bar with backdrop blur
- Desktop: horizontal nav links + user info + sign out
- Mobile: stacked nav links below main bar
- Active link highlighting via `usePathname()`
- RBAC: currently shows all links regardless of role (needs RBAC filtering)

## What Needs Changing (per prompts)
- Migrate AuthProvider to Supabase Auth client (`onAuthStateChange`)
- Add RBAC-aware navigation (hide admin links for staff)
- Add warehouse switcher dropdown
- Add loading skeleton for auth state
- Implement error boundary wrapper
- Add service worker registration component

## Prompts in This Directory
1. `02-app-shell-navigation-rbac.md` — App shell with RBAC navigation, warehouse switcher, localStorage preferences

## Related
- Auth pages: `../app/(auth)/prompts/`
- Auth API: `../../api/prompts/01-supabase-auth-session-api.md`
- RBAC middleware: `../../api/prompts/02-rbac-middleware-warehouse-guard.md`


---

# Imported Prompts

## 02-app-shell-navigation-rbac.md

# Prompt 02 — App Shell, Navigation, Role-Aware UI & User Preferences

## Role
Build the authenticated layout shell for WareHouse: navigation, warehouse context, role-gated menus, and user preferences.

## Problem Statement
Roles from `database.md`: **admin**, **manager**, **staff**. Staff must only see own DOs; admin/manager see warehouse-wide tools.

### Navigation Items
| Route | Label | Visible To |
|-------|-------|------------|
| /do | Delivery Orders | All |
| /do/new | New DO | All |
| /items | Items | All |
| /parties | Parties | All |
| /dashboard | Dashboard | Admin, Manager |
| /users | Users | Admin |
| /audit | Audit Log | Admin, Manager (own for staff) |
| /settings | Settings | Admin |

### Layout Components
- **Top bar:** brand wordmark "WareHouse" (dominant, [Source Serif 4](https://fonts.google.com/specimen/Source+Serif+4)), warehouse name, user avatar/name, sign-out
- **Side nav (desktop) / drawer (mobile):** navigation links
- **Active route indication:** via `usePathname()` from Next.js App Router
- **Skip link:** for keyboard accessibility ([MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility))
- **Landmark regions:** `<header>`, `<nav>`, `<main>` for screen readers

### User Preferences (localStorage)
```javascript
{
  "theme": "light",            // future: light/dark
  "language": "en",            // future: en/hi
  "lastWarehouse": "wh_001",   // for multi-warehouse (future)
  "dashboardLayout": "grid",   // grid/table toggle
  "itemsPerPage": 25           // pagination preference
}
```

### Recently Accessed (Quick Navigation)
```javascript
{
  "recentDOs": ["do_001", "do_002", "do_003"],
  "recentItems": ["item_1", "item_4"],
  "lastViewed": "2026-08-07T10:00:00"
}
```
- Update on DO/item view
- Show "Recent" section in nav or command palette
- Max 10 recent items

### Sign-Out
- Call `supabase.auth.signOut()`
- Log `logout` to audit
- Clear all warehouse-specific caches
- Redirect to login

### Soft-Deleted Warehouse Handling
- If `app_users.warehouse.is_deleted === true` → show blocking banner
- "This warehouse has been deactivated. Contact admin to restore."

### Visual Decisions
- Color tokens: `--wh-ink: #2C3333`, `--wh-slate: #395B64`, `--wh-mist: #A5C9CA`, `--wh-paper: #E7F6F2`
- Typography: **Source Serif 4** (brand) + **IBM Plex Sans** (UI)
- Collapse to drawer on small viewports using `<dialog>` or disclosure pattern

## Connections
- Session from Prompt 01 / `AuthProvider`
- Hides routes that backend will 403 anyway (defense in depth with `backend/02`)
- Staff-only pages rely on RLS — UI hiding is not security
- User preferences read by dashboard (`frontend/06`) and DO list (`frontend/03`)

## Acceptance Criteria
- [ ] Role from `app_users.role` drives menu visibility
- [ ] Soft-deleted warehouse shows blocking banner
- [ ] Layout in `website/src/app/(dashboard)/layout.tsx`
- [ ] User preferences saved/loaded from localStorage
- [ ] Recently accessed DOs shown for quick navigation
- [ ] Sign-out clears caches and redirects


---

