# Prompt 11 — Centralized Error Handling Utilities

## Role
Backend engineer implementing the error handling patterns from database.md § Error Handling.

## Problem Statement
database.md defines specific error types, retry logic, and user messages. Build reusable utilities.

### Error Classes
```typescript
class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public retryable: boolean = false
  ) { super(message); }
}

class ValidationError extends AppError {
  constructor(field: string, issue: string) {
    super('validation_error', `${field}: ${issue}`, 400);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super('not_found', `${resource} not found`, 404);
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super('conflict', message, 409);
  }
}

class PermissionError extends AppError {
  constructor(message = "You don't have permission for this action.") {
    super('permission_denied', message, 403);
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('rate_limit_exceeded',
      `Too many requests. Please wait ${retryAfter} seconds.`, 429);
    this.retryAfter = retryAfter;
  }
}
```

### Database Error Mapping
Per database.md § Error Handling:

| DB Error | App Error | User Message | Retry? |
|----------|-----------|-------------|--------|
| Connection timeout | AppError | "Data save slow, please wait..." | Yes (3x) |
| Unique violation | ConflictError | "DO number already exists. Use a different number." | No |
| FK violation | NotFoundError | "Referenced record not found." | No |
| Check violation | ValidationError | "Invalid value for [field]." | No |
| RLS violation | PermissionError (403) | "You don't have permission for this action." | No |

### Retry Logic (Connection Timeouts)
```typescript
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError;
  for (let i = 0; i < maxAttempts; i++) {
    try { return await fn(); }
    catch (e) {
      lastError = e;
      if (!(e instanceof AppError && e.retryable)) throw e;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); // 1s, 2s, 4s
    }
  }
  throw lastError;
}
```

### Network Failure Handling
From database.md § Error Handling:
- Frontend queues actions when offline (Prompt 09)
- Backend must handle: connection timeout, DNS failure, TLS errors
- Return retryable error for transient failures
- Return non-retryable for permanent failures (4xx)

### Concurrent Edit Conflict
- When two users edit the same DO simultaneously
- Database detects conflict → return: "This record was modified. Please refresh and try again."
- Frontend shows conflict resolution prompt

### Error Logging
- All errors logged to audit trail with action `ERROR`
- Include: timestamp, user_id, error type, error message
- Admin can view error logs in audit section

## Connections
- Every backend prompt uses these utilities
- Frontend `frontend/12` maps error codes to UI messages
- Audit `backend/08` logs errors
- Testing validates error paths

## Acceptance Criteria
- [ ] All 5 DB error types mapped to user-friendly messages
- [ ] Retry logic works for connection timeouts (1s, 2s, 4s backoff)
- [ ] Concurrent edit conflict detected and surfaced
- [ ] Errors logged to audit trail
- [ ] Network failures classified as retryable/non-retryable
