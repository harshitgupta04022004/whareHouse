# Prompt 08 — Rate Limit & Idempotency Key Tests

## Role
Chaos and API resilience tests for rate limiting and idempotent operations.

## Problem Statement
From database.md § Rate Limiting:

### Rate Limit Tests
1. **Login burst:** 16 login attempts in 15 minutes → 16th should be blocked (account locked 30 min)
2. **Create DO burst:** 51 rapid DO creates → 51st returns 429 with `retryAfter` field
3. **Update DO burst:** 51 rapid updates → 51st returns 429
4. **Delete DO burst:** 21 rapid deletes → 21st returns 429
5. **Dashboard burst:** 101 rapid dashboard views → 101st returns 429
6. **Upload burst:** 11 rapid uploads → 11th returns 429

### Rate Limit Response Format
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please wait 30 seconds.",
  "retryAfter": 30
}
```
Assert this exact shape.

### Idempotency Tests
1. Create DO with `Idempotency-Key: abc123` → success, returns DO id
2. Create DO with same `Idempotency-Key: abc123` → returns SAME DO id, no duplicate
3. Create DO with `Idempotency-Key: def456` → different DO id
4. Verify only ONE row in delivery_orders for key abc123

### Time-Based Testing
- Use fake timers or a resettable rate limiter store
- Do NOT rely on real clock (tests would be slow/flaky)
- Reset limiter between test groups

## Connections
- `backend/09` (rate limiter + idempotency)
- `frontend/09` (offline queue sends idempotency keys)
- `database.md` § Rate Limiting for exact numbers

## Acceptance Criteria
- [ ] All 6 rate limit scenarios tested
- [ ] Idempotency deduplication verified
- [ ] Tests complete in < 30 seconds total
- [ ] No reliance on real time
