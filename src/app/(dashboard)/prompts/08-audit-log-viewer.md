# Prompt 08 — Audit Log Viewer UI

## Role
Build a read-only audit explorer for admins/managers (staff: own actions only).

## Problem Statement
`audit_log` is append-only with JSONB `old_data`/`new_data`, hash chain, IP, UA, session_id, request_id.
UI needs:
- Filters: date, entity, action, user
- Expandable row diffs (before/after) — render JSON as readable key/value diff
- Integrity check button calling backend verification API
- Never offer edit/delete controls

Use semantic `<details>`/`<summary>` or accessible accordion ([MDN details](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details)).

## Connections
- `database/07` hash triggers; `backend/08` integrity endpoint
- Login/logout from auth flows appear here

## Acceptance Criteria
- [ ] Diff highlights changed keys only
- [ ] Pagination for high-volume logs
- [ ] Integrity failure shows clear warning banner
