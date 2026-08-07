# Testing Prompts

Prompts for building the comprehensive test suite.

## Files in This Directory
1. `01-playwright-auth-e2e.md` — Playwright auth happy path + lockout UX
2. `02-rls-tenant-isolation-suite.md` — RLS tenant isolation test suite
3. `03-do-crud-api-integration.md` — DO CRUD API integration tests
4. `04-rbac-matrix-tests.md` — RBAC permission matrix tests
5. `05-github-actions-ci-workflow.md` — GitHub Actions CI pipeline
6. `06-audit-integrity-tests.md` — Audit log integrity tests
7. `07-dashboard-aggregation-golden.md` — Dashboard aggregation golden tests
8. `08-rate-limit-idempotency-tests.md` — Rate limiting and idempotency tests
9. `09-drive-upload-integration-mocked.md` — Google Drive upload tests (mocked)
10. `10-restore-drill-automation.md` — Backup restore drill automation

## Build Order
1. `01` (auth E2E) -> `02-04` (integration) -> `05` (CI) -> `06-10` (specialized)

## Context
- API endpoints under test: `../api/prompts/`
- Database fixtures: `../database/prompts/`
- CI pipeline: `../deployment/prompts/02-deployment-pipeline-preview.md`


---

# Imported Prompts

## 01-playwright-auth-e2e.md

# Prompt 01 — Playwright E2E: Auth Happy Path & Lockout UX

## Role
QA automation engineer. Add Playwright tests for WareHouse auth screens and wire them for local + CI.

## Problem Statement
Manual login testing will miss regressions. Create E2E coverage:
- Signup validation errors (empty fields, bad email) using accessible selectors (`getByLabel`, `getByRole`) — see [MDN ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- Successful login redirects to dashboard
- Invalid password shows safe error
- After N failures, UI reflects rate-limit / lock messaging from API
- Session cookie present; logout clears session and returns to login

Use a dedicated Supabase test project or local stubs — never production credentials.

## Connections
- Frontend auth Prompt 01; backend session Prompt 01
- GitHub Actions workflow Prompt 05 will run these
- Database seed users from `database/01` seed

## Acceptance Criteria
- [ ] `npx playwright test` passes headless
- [ ] Screenshots on failure uploaded as CI artifacts
- [ ] No hardcoded real user passwords in repo (use env secrets)


---

## 02-rls-tenant-isolation-suite.md

# Prompt 02 — Automated RLS / Tenant Isolation Test Suite

## Role
Security-focused test engineer. Prove Warehouse A cannot read Warehouse B.

## Problem Statement
Create integration tests (pgTAP, Jest+supabase-js, or SQL scripts) that:
1. Seed two warehouses, users, DOs, items, audit rows
2. Authenticate as WH-A staff → assert zero rows from WH-B for every table
3. Attempt INSERT into WH-B UUID → rejected by RLS WITH CHECK
4. Staff cannot SELECT another user’s DOs in same warehouse
5. Admin in WH-A still cannot see WH-B

This is the **most critical** test suite for the product’s isolation promise in `database.md`.

## Connections
- `database/03` RLS policies
- `backend/02` RBAC
- Must run on every PR (Prompt 05)

## Acceptance Criteria
- [ ] Fails CI if any cross-tenant leak
- [ ] Documented how to add new tables to the suite


---

## 03-do-crud-api-integration.md

# Prompt 03 — Delivery Order CRUD API Integration Tests

## Role
Backend test engineer covering atomic DO operations.

## Problem Statement
Tests for create/update/delete DO + lines:
- Happy path multi-item create → item_count matches trigger
- Duplicate do_number → 409/400 mapped message
- Invalid date (future) rejected
- Weight mismatch (client sends wrong total_weight) corrected or rejected
- Rollback when one line has invalid item_id
- Pagination cursor stability when inserting mid-list

## Connections
- `backend/04`, `database/05` triggers, frontend form contracts
- Use [MDN Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) in Node test client or supabase-js

## Acceptance Criteria
- [ ] Coverage report threshold for DO service module (≥80%)
- [ ] Parallel-safe tests (unique do_numbers per run)


---

## 04-rbac-matrix-tests.md

# Prompt 04 — Role Matrix Automated Tests (Admin/Manager/Staff)

## Role
Encode the RBAC tables from `database.md` as executable tests — the source of truth for access control.

## Problem Statement
database.md defines three roles with specific permissions. Each row in the matrix must be a test case.

### Admin Matrix (test all = PASS)
- View all DOs (all users in WH) → allow
- Create DO → allow
- Edit any DO → allow
- Delete any DO → allow
- Add/remove DO items → allow
- Add/delete items → allow
- Upload documents → allow
- View audit logs → allow
- Manage users (add/remove/update) → allow
- View all user work → allow
- View Admin Dashboard → allow
- Delete warehouse → allow (soft delete)

### Manager Matrix (test = PASS for allowed, FAIL for denied)
- Same as admin EXCEPT:
- Manage users → DENY
- Delete warehouse → DENY

### Staff Matrix (test = PASS for own, DENY for others)
- View own DOs → allow
- View other users' DOs → DENY
- Create DO → allow
- Edit own DOs → allow
- Edit others' DOs → DENY
- Delete own DOs → allow
- Delete others' DOs → DENY
- Add/remove DO items (own DOs) → allow
- Manage users → DENY
- View all user work → DENY
- View all warehouse audit logs → DENY
- Delete warehouse → DENY

### Test Approach
- Table-driven tests: role × action × expected_result
- API-level tests (primary) + one E2E smoke per role
- Use separate test users per role seeded in test DB

## Connections
- Backend RBAC middleware (`backend/02`)
- Frontend nav visibility (`frontend/02`)
- RLS isolation (`database/03`)
- CI runs this on every PR (`testing/05`)

## Acceptance Criteria
- [ ] Every cell in the 3-role matrix has a test case
- [ ] Tests run against real API (not mocked RBAC)
- [ ] Staff cannot access admin endpoints
- [ ] Manager cannot manage users
- [ ] Matrix CSV or TS object reviewed in PR


---

## 05-github-actions-ci-workflow.md

# Prompt 05 — GitHub Actions CI Workflow (Lint, Typecheck, Test, Build)

## Role
DevOps engineer creating `.github/workflows/ci.yml` for the WareHouse monorepo/`website` app.

## Problem Statement
On pull_request + push to main:
1. Install deps (npm ci)
2. ESLint + `tsc --noEmit`
3. Unit tests
4. Start Supabase local / use service container Postgres with migrations applied
5. Integration + RLS suites
6. Playwright (with webServer)
7. `next build`
Fail fast; cache npm; upload artifacts (playwright-report, coverage).

Reference: [GitHub Actions docs](https://docs.github.com/en/actions), [MDN progressive enhancement mindset](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement) — CI should catch a11y regressions via axe if feasible.

## Connections
- All testing prompts plug into this workflow
- Production deploy Prompt 02 only after CI green
- Secrets: `SUPABASE_TEST_*`, `PLAYWRIGHT_*` via GitHub Secrets — never commit `.env` from database.md

## Acceptance Criteria
- [ ] Workflow file complete with concurrency group cancel-in-progress
- [ ] Status badge snippet for README
- [ ] Branch protection instructions documented


---

## 06-audit-integrity-tests.md

# Prompt 06 — Audit Hash Chain & Append-Only Tests

## Role
Verify that the audit log is truly tamper-proof and append-only.

## Problem Statement
Test every integrity mechanism from database.md § Audit Integrity:

### 1. Append-Only Enforcement
- As authenticated role: INSERT succeeds ✅
- As authenticated role: UPDATE fails ❌ (revoked)
- As authenticated role: DELETE fails ❌ (revoked)
- Test both via Supabase client and raw SQL

### 2. Hash Chain Validation
- Insert sequence of 5 audit rows
- Call `verify_audit_integrity(warehouse_id)` → returns ok=true
- Tamper with row 3's `current_hash` (requires service role)
- Re-verify → returns ok=false, broken_at=3

### 3. Full State Snapshots
- Create a DO → audit row has `old_data=null`, `new_data=full_row`
- Update DO direction → audit row has both `old_data` and `new_data`
- Delete DO → audit row has `old_data=full_row`, `new_data=null`
- Verify JSONB contents match actual row values

### 4. RLS Audit Isolation
- Warehouse A inserts audit row
- Warehouse B authenticates → cannot SELECT Warehouse A's audit rows
- Warehouse B attempts INSERT with Warehouse A's warehouse_id → blocked by WITH CHECK

### 5. Hash Chain Correctness
- Recompute hash using canonical formula: SHA256(timestamp + user_id + action + entity_id + old_data + new_data)
- Compare with stored `current_hash`
- Mismatch = test failure

## Connections
- `database/04` (audit table), `database/07` (verify function)
- `backend/08` (audit writer + integrity API)
- `frontend/08` (audit viewer with verify button)

## Acceptance Criteria
- [ ] All 5 test categories pass
- [ ] Tamper detection is deterministic
- [ ] Tests run in CI without flaking (no timing dependencies)


---

## 07-dashboard-aggregation-golden.md

# Prompt 07 — Dashboard Aggregation Golden Fixtures

## Role
Build golden-file tests for the inventory matrix math — the core business logic.

## Problem Statement
Seed known DOs and verify the dashboard aggregation matches expected values.

### Fixture Data
Create this seed (all in same warehouse, same user):
```
DO-100: IN, 2026-08-01, Wheat, 10 bags × 50kg = 500kg
DO-101: IN, 2026-08-03, Wheat, 5 bags × 50kg = 250kg
DO-102: OUT, 2026-08-05, Wheat, 3 bags × 50kg = 150kg
DO-103: IN, 2026-08-02, Rice, 4 bags × 30kg = 120kg
DO-104: OUT, 2026-08-06, Rice, 2 bags × 30kg = 60kg
```

### Expected Results

**Date range 2026-08-01 to 2026-08-03:**
| Product | IN (range) | OUT (range) | Remaining (all time) |
|---------|-----------|------------|---------------------|
| Wheat | 750 kg | 0 kg | 600 kg |
| Rice | 120 kg | 0 kg | 60 kg |

**Date range 2026-08-05 to 2026-08-07:**
| Product | IN (range) | OUT (range) | Remaining (all time) |
|---------|-----------|------------|---------------------|
| Wheat | 0 kg | 150 kg | 600 kg |
| Rice | 0 kg | 60 kg | 60 kg |

**Full range 2026-08-01 to 2026-08-07:**
| Product | IN (range) | OUT (range) | Remaining (all time) |
|---------|-----------|------------|---------------------|
| Wheat | 750 kg | 150 kg | 600 kg |
| Rice | 120 kg | 60 kg | 60 kg |

### Edge Cases to Test
- Product with only IN, no OUT → remaining = total_in
- Product with only OUT, no IN → remaining = negative (or zero if clamped)
- Product with zero transactions → remaining = 0
- Bag size change after historical lines → remaining bags use CURRENT bag_size from items table (document this behavior)
- Empty warehouse → all zeros

### Test Method
- Seed SQL fixtures
- Call dashboard API with date ranges
- Assert exact numeric values (not approximations)
- Store expected values as JSON fixture files

## Connections
- `backend/06` (dashboard API), `database/06` (views)
- `frontend/06` (dashboard UI)

## Acceptance Criteria
- [ ] All fixture scenarios pass with exact numbers
- [ ] Edge cases documented with expected behavior
- [ ] Fixture SQL checked into `testing/fixtures/`


---

## 08-rate-limit-idempotency-tests.md

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


---

## 09-drive-upload-integration-mocked.md

# Prompt 09 — Drive Upload Tests (Mocked Google API)

## Role
Test the file upload pipeline without hitting real Google Drive in CI.

## Problem Statement
Mock the Google Drive SDK and test:

### 1. Upload Flow
- User uploads invoice.pdf (2.5 MB)
- Mock Drive API returns `drive_file_id: mock123`
- Assert `files` table row inserted with correct metadata
- Assert audit row with `action: 'upload_file'`
- Assert file placed in correct Drive folder path: `Documents/{user_name}/{do_number}/`

### 2. Folder Creation
- First upload to new warehouse → mock creates folder tree
- Second upload → folder already exists, no duplicate creation
- Assert root folder ID matches env `DRIVE_ROOT_FOLDER_ID`

### 3. MIME Type Validation
- Accept: `application/pdf`, `image/jpeg`, `image/png`, `text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Reject: `application/exe`, `video/mp4` → returns 400 with "File type not allowed"
- Assert category enforcement: PDF → `document`, not `report`

### 4. Size Limits
- File > 100 MB → rejected with "File too large (max 100 MB)"
- File = 0 bytes → rejected with "Empty file"

### 5. Rollback on DB Failure
- Mock Drive upload succeeds
- Mock DB insert fails
- Assert: Drive file is deleted (compensating action)
- Assert: No `files` row left behind

### 6. Audit Logging
- Successful upload → audit row with `new_data` containing file metadata
- Failed upload → audit row with error details

## Connections
- `backend/10` (Drive API), `database/08` (files table)
- `frontend/10` (upload UI)
- `production/03` (Drive SA in production)

## Acceptance Criteria
- [ ] No real Google API calls in CI
- [ ] All 6 test categories pass
- [ ] Mock accurately simulates Drive SDK response shapes


---

## 10-restore-drill-automation.md

# Prompt 10 — Backup Restore Drill Automation

## Role
Automate the disaster recovery drill that validates backup integrity and restoration procedures.

## Problem Statement
From database.md § Backup & Recovery Strategy:

### Drill Workflow (GitHub Actions `workflow_dispatch`)
1. **Input:** backup artifact path (or "latest")
2. **Spin up** ephemeral Postgres (service container or Supabase branch)
3. **Load** backup SQL dump
4. **Run smoke queries:**
   - `SELECT count(*) FROM warehouses` → must be > 0
   - `SELECT count(*) FROM delivery_orders` → must be > 0
   - `SELECT count(*) FROM audit_log` → must be > 0
5. **Run RLS subset:** cross-warehouse isolation test from testing/02
6. **Run audit integrity:** hash chain verification from testing/06
7. **Run dashboard math:** golden fixtures from testing/07
8. **Publish results:** pass/fail summary in job summary markdown
9. **Cleanup:** destroy ephemeral Postgres

### Recovery Procedure Documentation
The drill also produces a human-readable runbook for operators:
- Scenario 1: Accidental data deletion → PITR restore
- Scenario 2: Database corruption → restore from daily backup
- Scenario 3: Warehouse soft delete → restore within 30 days
- Scenario 4: Full recovery → restore from weekly export

### Cadence
- Manual: on-demand via `workflow_dispatch`
- Automated: quarterly (1st of Jan/Apr/Jul/Oct)
- Alert if no drill run in 90 days

## Connections
- `database/10` (backup exports), `production/08` (backup monitoring)
- RLS tests from `testing/02`, audit from `testing/06`, dashboard from `testing/07`

## Acceptance Criteria
- [ ] `workflow_dispatch` with backup path input works
- [ ] All smoke queries pass against loaded backup
- [ ] RLS isolation verified against restored data
- [ ] Job summary shows clear pass/fail with drill timestamp


---

