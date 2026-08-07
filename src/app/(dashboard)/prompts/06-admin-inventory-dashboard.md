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
