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
