# Prompt 09 — Shared Validation, Rate Limiting & Idempotency

## Role
Cross-cutting backend infrastructure: validation schemas, rate limiter, and idempotency key store.

## Problem Statement

### Validation Schemas (Zod or Valibot)
Mirror every validation rule from database.md § Input Validation Rules:

| Entity | Field | Rule |
|--------|-------|------|
| DO | do_number | required, 1-50 chars, unique within warehouse |
| DO | date | required, valid date, not future, not older than 365 days |
| DO | direction | required, 'IN' or 'OUT' |
| DO | party_id | optional, must exist in parties if provided |
| DO | vehicle_number | optional, 10-15 chars, format XX-XX-XX-XXXX |
| DO Item | item_id | required, must exist in items |
| DO Item | bags | required, positive integer, max 10000 |
| DO Item | total_weight | required, positive, calculated: bags × bag_size |
| Item | name | required, 1-100 chars, unique within warehouse |
| Item | bag_size | required, positive number, default 50 |
| Party | name | required, 1-100 chars, unique within warehouse |
| User | name | required, 2-100 chars |
| User | email | required, valid email, unique |
| User | role | required, 'admin' or 'manager' or 'staff' |

### Rate Limiter
Per database.md § Rate Limiting:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 15 attempts | 15 min (lock 30 min) |
| Password reset | 5 attempts | 1 hour |
| Create DO | 50 requests | 1 min |
| Update DO | 50 requests | 1 min |
| Delete DO | 20 requests | 1 min |
| Dashboard | 100 requests | 1 min |
| File upload | 10 files | 1 min |

Response: `{ error: "rate_limit_exceeded", message: "...", retryAfter: N }`

Implementation: sliding window or token bucket. Store in Redis/Upstash for distributed, or in-memory for single-instance.

### Idempotency
- Header: `Idempotency-Key: <uuid>`
- Store response in Redis/Map for 24 hours
- Same key → return cached response (no duplicate DO created)
- Different key → process normally
- Apply to: DO create endpoint (critical for offline queue retry)

## Connections
- Frontend offline queue (`frontend/09`) sends idempotency keys
- Auth login (`backend/01`) uses login rate limits
- DO API (`backend/04`) uses create/update rate limits + idempotency
- Testing Prompt 08 validates all of this

## Acceptance Criteria
- [ ] All 13 validation rules from database.md have Zod schemas
- [ ] Rate limiter matches exact numbers from database.md
- [ ] Idempotency prevents duplicate DOs
- [ ] 429 response shape matches database.md spec
