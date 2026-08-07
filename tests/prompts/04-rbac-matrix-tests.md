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
