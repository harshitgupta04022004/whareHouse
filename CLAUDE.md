# WareHouse — Project Context

Radheshyam Warehouse DO Records web app. Replaces Google Sheets with a full-stack web application for tracking delivery orders (DOs), items, parties, and warehouse inventory.

## Tech Stack
- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript 5
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Edge Functions)
- **File Storage**: Google Drive API (service account)
- **CI/CD**: GitHub Actions
- **Deployment**: Vercel (frontend) + Supabase Cloud (backend)

## Directory Structure

```
website/
├── src/                  # Frontend source code (Next.js App Router)
│   ├── app/              # Route groups: (auth), (dashboard)
│   ├── components/       # Shared React components
│   └── lib/              # Utilities, types, store, helpers
├── api/                  # Backend API prompts (Supabase Edge Functions / Route Handlers)
├── database/             # Database schema, migrations, RLS, triggers
├── tests/                # E2E, integration, and unit tests
├── deployment/           # Production config, secrets, CI/CD, monitoring
└── prompts/              # Original prompt archive (source of truth)
```

## Key Files
- `src/app/layout.tsx` — Root layout (fonts, AuthProvider)
- `src/app/(auth)/` — Login/signup pages (Supabase Auth)
- `src/app/(dashboard)/` — Main app: DO records, items, challans
- `src/components/AuthProvider.tsx` — Auth context (Supabase session)
- `src/components/Navbar.tsx` — Navigation with RBAC-aware links
- `src/lib/types.ts` — TypeScript interfaces (DO, DOItem, User, WarehouseItem)
- `src/lib/store.ts` — Data access layer (currently localStorage, migrates to Supabase)
- `src/lib/utils.ts` — Formatting, date helpers, calculations

## Design Tokens
- Brand: `#6366f1` (indigo), Surface: `#0e0e24` (dark), Border: `#252545`
- Fonts: Sora (display) + Inter (body) via `next/font`
- Radius: 14px cards, 11px inputs, 9px small elements
- Dark mode by default (`color-scheme: dark`)

## Database Schema (see `../database.md`)
Tables: `warehouses`, `app_users`, `parties`, `items`, `delivery_orders`, `do_items`, `audit_log`, `files`
RLS: Every query scoped by `current_warehouse_id()`
Roles: admin, manager, staff

## Build Order
1. Database schema + migrations (`database/prompts/`)
2. Backend API layer (`api/prompts/`)
3. Frontend components + pages (`src/*/prompts/`)
4. Testing (`tests/prompts/`)
5. Production deployment (`deployment/prompts/`)

## Prompt Locations (56 total)
Each domain has its own `prompts/` subdirectory with CLAUDE.md context:
- `src/app/(auth)/prompts/` — Auth UI (3 prompts)
- `src/app/(dashboard)/prompts/` — Dashboard features (6 prompts)
- `src/components/prompts/` — Shared components (1 prompt)
- `src/lib/prompts/` — Utilities & offline (4 prompts)
- `api/prompts/` — Backend API (12 prompts)
- `database/prompts/` — Schema & migrations (10 prompts)
- `tests/prompts/` — Testing (10 prompts)
- `deployment/prompts/` — Production (10 prompts)

## Conventions
- All functions use Supabase client (anon for browser, service role for server)
- RLS enforced at database level — never bypass in application code
- Audit log: append-only with JSONB snapshots and hash chain
- Input validation: API layer + database constraints (belt and suspenders)
- Error handling: typed errors with user-friendly messages
- Offline support: service worker + IndexedDB queue for mutations
