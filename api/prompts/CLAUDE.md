# Backend API Prompts

Prompts for building the server-side API layer (Supabase Edge Functions or Next.js Route Handlers).

## Files in This Directory
1. `01-supabase-auth-session-api.md` — Auth session, app_users bootstrap
2. `02-rbac-middleware-warehouse-guard.md` — RBAC middleware, warehouse guard
3. `03-delivery-orders-list-query-api.md` — DO list query with filters
4. `04-do-create-update-transaction.md` — DO create/update with transactions
5. `05-items-parties-crud-api.md` — Items and parties CRUD
6. `06-dashboard-aggregation-api.md` — Dashboard aggregation queries
7. `07-user-invite-admin-api.md` — User invite and admin operations
8. `08-audit-writer-integrity-api.md` — Audit log writer with hash chain
9. `09-validation-ratelimit-idempotency.md` — Validation, rate limiting, idempotency
10. `10-google-drive-files-api.md` — Google Drive file operations
11. `11-error-handling-utilities.md` — Centralized error handling
12. `12-google-oauth-setup.md` — Google OAuth integration

## Build Order
1. `01` (auth) -> `02` (RBAC) -> `03-06` (CRUD) -> `07-08` (admin/audit) -> `09` (validation) -> `10-12` (files/OAuth)

## Context
- Database schema: `../database/prompts/`
- Frontend consumes these APIs: `../src/`
- Deployment config: `../deployment/prompts/`


---

# Imported Prompts

## 01-supabase-auth-session-api.md

# Prompt 01 — Supabase Auth Session & App User Bootstrap API

## Role
Senior backend engineer for WareHouse (Next.js Route Handlers or Supabase Edge Functions — choose one stack and document it). Implement auth session endpoints and first-login `app_users` linkage.

## Problem Statement
Auth flow from `database.md`:
1. Supabase Auth returns JWT (`auth.uid()`)
2. App looks up `app_users`
3. RLS scopes all queries via `current_warehouse_id()`
4. Login/logout written to `audit_log`

Build:
- Server helpers to create Supabase clients (anon + service role — service role never exposed to browser)
- `/api/auth/session` — current user + warehouse + role
- Post-login hook: if `app_users` missing → 403 with “Ask admin to invite you” (no auto-join random warehouse)
- Audit insert for `login` / `logout` / `switch_warehouse` with ip, user_agent, session_id

## Connections
- Frontend Prompt 01 consumes session
- Database RLS helper `current_warehouse_id()`
- Rate limits: 15 login attempts / 15 min (`database.md` Rate Limiting)

## Acceptance Criteria
- [ ] No secret key in client bundles
- [ ] Audit rows insert-only
- [ ] Typed errors match Error Handling table


---

## 02-rbac-middleware-warehouse-guard.md

# Prompt 02 — RBAC Middleware & Warehouse Isolation Guards

## Role
Implement application-layer RBAC matching the matrices in `database.md` (defense in depth on top of RLS).

## Problem Statement
Even with RLS, staff must not call admin-only APIs successfully.
- Middleware maps route → allowed roles
- Staff DO queries force `user_id = auth.uid()`
- Admin/manager may act on any DO in warehouse
- Return 403 with stable error code `permission_denied`
- Never accept `warehouse_id` from client body for scoping — derive from `app_users`

## Connections
- Frontend shell hides links but this is the real enforcement
- Testing Prompt 02 attacks cross-tenant IDs
- Complements `database/03` RLS policies

## Acceptance Criteria
- [ ] Centralized policy module unit-tested
- [ ] Logs denied attempts to audit as ERROR or security event


---

## 03-delivery-orders-list-query-api.md

# Prompt 03 — Delivery Orders List & Filter API

## Role
Backend engineer implementing the paginated DO list API using indexes.

## Problem Statement
The DO list is the most-used API. It must be fast, correct, and respect RBAC.

### Endpoint
`GET /api/do?cursor=<string>&limit=<number>&startDate=<date>&endDate=<date>&direction=<IN|OUT>&partyId=<uuid>&q=<string>&userId=<uuid>`

### Query Logic
```sql
SELECT
  d.do_id, d.do_number, d.direction, d.date, d.item_count,
  d.party_id, p.name as party_name,
  d.user_id, u.name as creator_name,
  d.created_at, d.updated_at
FROM delivery_orders d
LEFT JOIN parties p ON p.party_id = d.party_id
LEFT JOIN app_users u ON u.user_id = d.user_id
WHERE d.warehouse_id = current_warehouse_id()
  AND d.date BETWEEN :startDate AND :endDate  -- if provided
  AND d.direction = :direction                 -- if provided
  AND d.party_id = :partyId                    -- if provided
  AND d.do_number ILIKE '%' || :q || '%'       -- if provided (text search)
  AND d.user_id = :userId                      -- if provided (admin only)
ORDER BY d.date DESC, d.created_at DESC
LIMIT :limit;
```

### Index Usage
- Primary filter: `idx_do_warehouse_date` on (warehouse_id, date DESC)
- Party filter: sequential scan (small dataset, acceptable)
- Text search on do_number: sequential scan (acceptable for 200/day)

### Staff Restriction
- Staff users can ONLY see their own DOs (`user_id = auth.uid()`)
- Admin/manager can see all DOs in warehouse
- Enforce server-side: if role=staff, ignore `userId` param and force `user_id = auth.uid()`

### DO Number
- DO number is a **manually entered string** by the admin (NOT auto-generated)
- Format is free-form: `DO-001`, `1234/25-26`, `CHL-2026/001`
- Text search uses `ILIKE` for case-insensitive partial match

### Pagination
- Cursor-based (not offset)
- Default limit: 20, max: 50
- Return: `{ items: [...], nextCursor: "...", hasMore: boolean }`

### Response Shape
```json
{
  "items": [
    {
      "do_id": "uuid",
      "do_number": "DO-001",
      "direction": "IN",
      "date": "2026-08-01",
      "item_count": 3,
      "party_name": "ABC Suppliers",
      "creator_name": "Rahul",
      "created_at": "2026-08-01T10:00:00Z",
      "updated_at": "2026-08-01T10:00:00Z"
    }
  ],
  "nextCursor": "2026-07-31T23:59:59Z",
  "hasMore": true
}
```

## Connections
- Frontend DO list (`frontend/03`)
- RBAC middleware (`backend/02`)
- Staff filtering enforced server-side
- Caching: short TTL or no-cache (real-time data)

## Acceptance Criteria
- [ ] Uses `idx_do_warehouse_date` index (verify with EXPLAIN)
- [ ] Staff cannot see other users' DOs
- [ ] Admin/manager can filter by userId
- [ ] Cursor pagination stable under concurrent inserts


---

## 04-do-create-update-transaction.md

# Prompt 04 — Atomic DO Create/Update With Line Items

## Role
Backend engineer implementing the transactional heart of WareHouse.

## Problem Statement
Create DO + N `do_items` in **one DB transaction**:
- Validate per Input Validation Rules
- Capture `bag_size` per line at write time
- Assign `sequence_num` 1..N
- Compute `total_weight = bags * bag_size` server-side (do not trust client weight blindly; verify)
- On unique violation → mapped error “DO number already exists…”
- Write audit rows with shared `request_id` for header + each line
- Updates: patch header; replace or diff lines carefully; maintain audit old/new snapshots
- Deletes: cascade do_items; audit before delete

`item_count` must NOT be written by app — trigger owns it.

## Connections
- Frontend form Prompt 04
- Triggers `database/05`
- Views update for dashboard
- Idempotency: `backend/09`

## Acceptance Criteria
- [ ] Partial failure rolls back entirely
- [ ] Concurrent duplicate do_number handled
- [ ] Rate limit 50 create/update per minute


---

## 05-items-parties-crud-api.md

# Prompt 05 — Items & Parties CRUD API

## Role
CRUD APIs for master data with warehouse scoping and FK-safe deletes.

## Problem Statement
- POST/PATCH/DELETE items & parties
- UNIQUE (warehouse_id, name) → friendly errors
- DELETE item blocked if referenced (`ON DELETE RESTRICT`) → “Item in use by delivery orders”
- GET items includes optional join to `item_totals` / `product_summary`
- Audit create/update/delete; bag_size change → `set_bag_size`

## Connections
- Frontend Prompt 05
- DO lines reference items
- RLS policies on both tables

## Acceptance Criteria
- [ ] warehouse_id always from session
- [ ] Pagination on list endpoints


---

## 06-dashboard-aggregation-api.md

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


---

## 07-user-invite-admin-api.md

# Prompt 07 — Admin User Invite / Role Update / Remove API

## Role
Backend for warehouse-scoped user administration via Supabase Auth Admin API + `app_users`.

## Problem Statement
- Invite: create Auth user (or generate invite link) + insert `app_users` with warehouse_id of caller
- Reject if email already in another warehouse
- Update role/details with audit `update_user`
- Remove: delete app_users (and Auth user policy — document cascade); audit `remove_user`
- Only role `admin` may call

## Connections
- Frontend Prompt 07
- FK `user_id` → auth.users CASCADE
- Testing cross-tenant invite

## Acceptance Criteria
- [ ] Service role used only on server
- [ ] Cannot change own role to lock out last admin without safeguard


---

## 08-audit-writer-integrity-api.md

# Prompt 08 — Audit Writer Helper & Integrity Verification API

## Role
Centralize audit logging and expose integrity verification.

## Problem Statement
Helper `writeAudit({ entity, entityId, action, oldData, newData, requestId })`:
- Fills warehouse_id, user_id, ip, ua, session_id
- Computes SHA-256 chain: previous_hash → current_hash per `database.md` Audit Integrity
- Integrity API: walk chain for warehouse, report breaks
- Never UPDATE/DELETE audit rows (DB revoke enforces)

Use Web Crypto or Node crypto in server runtime ([MDN SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest) if Edge-compatible).

## Connections
- All mutating backend prompts must use helper
- Frontend Prompt 08 displays results
- Database Prompt 07 may add DB trigger alternative — pick one source of truth and document

## Acceptance Criteria
- [ ] Unit tests for hash stability
- [ ] Admin-only integrity endpoint


---

## 09-validation-ratelimit-idempotency.md

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


---

## 10-google-drive-files-api.md

# Prompt 10 — Google Drive Upload, Download, Delete & File Validation API

## Role
Backend integration for the complete Google Drive file lifecycle from database.md.

## Problem Statement

### Upload (existing coverage)
- Ensure warehouse folder tree exists (Documents/{user}/{do_number}, etc.)
- Upload stream to Drive with service account
- Insert `files` row (drive_file_id, url, mime, size, category)
- Audit `upload_file`
- Rate limit 10/min

### File Type Validation (NEW)
From database.md § File Storage Checklist:
- **Allowed types (safe types):** `application/pdf`, `image/jpeg`, `image/png`, `text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (pdf, jpg, png are the primary safe types)
- **Rejected types:** `application/exe`, `video/mp4`, `application/zip` (unless backup category)
- Validation at API layer before Drive upload
- Category enforcement: PDFs → `document`, not `report`

### File Size Limits (NEW)
- Max 100 MB per file (from database.md)
- Reject with clear message: "File too large (max 100 MB)"
- 0-byte files rejected: "Empty file not allowed"

### Download (NEW)
```typescript
// Generate temporary download URL
const url = `https://drive.google.com/uc?export=download&id=${driveFileId}`;

// Or use Drive API for authenticated download
const response = await drive.files.get({
  fileId: driveFileId,
  alt: 'media',
});
```
- Return download URL to frontend
- Frontend opens in new tab or triggers download
- Audit log download event (optional)

### File Deletion (NEW)
From database.md § File Deletion:
- **Soft delete (recommended):** mark as deleted in DB, keep in Drive 30 days
- **Hard delete:** delete from Drive API + delete from `files` table
- Audit log deletion with `old_data` snapshot
- Compensating action: if DB delete succeeds but Drive delete fails, log warning

### Folder Path Building
```typescript
function getFolderPath(category: string, warehouse: string, user?: string, doNumber?: string): string {
  switch (category) {
    case 'document': return `Documents/${user}/${doNumber}/`;
    case 'report': return `Reports/`;
    case 'do_pdf': return `DOs/`;
    case 'template': return `Shared/Templates/`;
    case 'rate_list': return `Shared/Rate Lists/`;
    case 'contact': return `Shared/Contacts/`;
    case 'backup': return `Backups/`;
    default: return `Documents/${user}/`;
  }
}
```

### Drive API Rate Limits
- 12,000 queries per 100 seconds per project
- 10 GB per file, 10 TB per user
- 100 requests per batch
- Monitor quota usage, alert at 80%

## Connections
- Frontend uploads (`frontend/10`)
- Files table `database/08`
- Drive SA `production/03`
- Audit `backend/08`
- Rate limits `backend/09`

## Acceptance Criteria
- [ ] Upload validates MIME type and size before Drive call
- [ ] Download returns working URL
- [ ] Soft delete marks DB row, hard delete removes from Drive
- [ ] All file operations logged to audit
- [ ] Drive API rate limits documented and monitored


---

## 11-error-handling-utilities.md

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


---

## 12-google-oauth-setup.md

# Prompt 12 — Google OAuth Optional Integration

## Role
Backend engineer setting up Google OAuth as an optional login method via Supabase Auth.

## Problem Statement
database.md § Authentication lists Google OAuth as optional fallback. If configured, users can sign in with Google.

### Supabase Google OAuth Setup
1. Enable Google provider in Supabase Dashboard → Authentication → Providers
2. Add Google Client ID and Client Secret to Supabase env
3. Configure redirect URL: `{SUPABASE_URL}/auth/v1/callback`

### OAuth Flow
1. User clicks "Sign in with Google" button
2. Frontend calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
3. User authenticates with Google
4. Google redirects back to app with auth code
5. Supabase exchanges code for JWT
6. App looks up `app_users` by `auth.uid()`
7. If no `app_users` row → show "Ask admin to add you to a warehouse"
8. If `app_users` exists → proceed to dashboard

### Account Linking
- Google OAuth creates a Supabase Auth user with `app_users.user_id = auth.uid()`
- If user already has email/password account, Supabase can link them (same email)
- The `app_users` row is shared — no duplicate accounts

### Security
- CSRF protection via `state` parameter (Supabase handles)
- Redirect URL must be whitelisted in Google Console
- Never store Google tokens client-side
- Rate limit OAuth callbacks (same as login: 15/15 min)

### Frontend Button
- Show "Sign in with Google" button on login page (if configured)
- Use Google's official button styling or brand guidelines
- Button disabled when form is submitting

## Connections
- Frontend `frontend/01` adds Google sign-in button
- Backend `backend/01` handles session for OAuth users
- `app_users` linkage same as email/password flow
- Audit logs OAuth logins as `login` with provider metadata

## Acceptance Criteria
- [ ] Google OAuth works end-to-end (if configured)
- [ ] Falls back gracefully if Google OAuth not configured (button hidden)
- [ ] Same `app_users` row used for both auth methods
- [ ] OAuth callback rate-limited


---

