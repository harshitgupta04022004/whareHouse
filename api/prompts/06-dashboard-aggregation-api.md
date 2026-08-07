# Prompt 06 — Admin Dashboard Aggregation API

## Role
Implement the date-range inventory matrix API exactly as specified in `database.md` SQL.

## Problem Statement
- AuthZ: admin + manager only
- Params: startDate, endDate (inclusive)
- Return per product: total_in, total_out (range), remaining (all-time), bag_size, remaining_bags
- Prefer querying `product_summary` + filtered aggregates; or single SQL as documented
- Rate limit 100/min

## Connections
- Frontend Prompt 06
- Views `database/06`
- Indexes on DO date

## Acceptance Criteria
- [ ] Golden fixture test matches sample Wheat/Rice numbers pattern
- [ ] Invalid date range → 400
