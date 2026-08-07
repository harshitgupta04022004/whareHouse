# src/ — Frontend Source Code

Next.js 16 App Router codebase. All React components, pages, and client-side logic live here.

## Key Files
- `app/layout.tsx` — Root layout: fonts (Inter + Sora via `next/font`), AuthProvider wrapper
- `app/page.tsx` — Root redirect: authenticated → `/DOs`, unauthenticated → `/login`
- `app/globals.css` — Tailwind CSS 4 theme tokens, dark mode, aurora gradient, focus rings
- `components/AuthProvider.tsx` — React Context for Supabase session (user, login, signup, logout)
- `components/Navbar.tsx` — Top nav with RBAC-aware links, mobile responsive, user avatar
- `lib/types.ts` — TypeScript interfaces: `User`, `DO`, `DOItem`, `WarehouseItem`, `AppState`
- `lib/store.ts` — Data access layer (localStorage-based, migrating to Supabase queries)
- `lib/utils.ts` — Helpers: `formatWeight`, `formatDate`, `todayStr`, `last7DaysRange`, `createEmptyItem`

## Conventions
- All client components use `"use client"` directive
- Path alias: `@/` maps to `src/`
- Auth state managed via `useAuth()` hook from `AuthProvider`
- Data fetched via store functions (will migrate to Supabase `useQuery` hooks)
- Styling: Tailwind CSS utility classes, CSS custom properties for design tokens
- No `any` types — use generated Supabase types or local interfaces

## Prompt Locations
- `app/(auth)/prompts/` — Auth UI prompts (login, signup, password reset, error boundaries)
- `app/(dashboard)/prompts/` — Dashboard feature prompts (DO list, create form, items, admin)
- `components/prompts/` — Component prompts (app shell, navigation, RBAC)
- `lib/prompts/` — Utility prompts (offline queue, caching, Drive upload, PDF)

## Related
- Backend API prompts: `../api/prompts/`
- Database schema: `../database/prompts/`
- Full project context: `../CLAUDE.md`
