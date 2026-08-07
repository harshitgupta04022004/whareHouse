# Prompt 10 — DO Documents Upload & Drive File UI

## Role
Frontend for attaching scanned docs to DOs via Google Drive (metadata in `files` table).

## Problem Statement
Users upload invoice/receipt images/PDFs against a DO. UI:
- Drag-and-drop + file picker (`accept` PDF/JPEG/PNG)
- Progress via [XMLHttpRequest upload progress](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload) or fetch + UX indeterminate if unavailable
- List files from `files` with open-in-Drive link
- Category default `document`; enforce size limits from backend
- Audit shows `upload_file`

## Visual Decisions
- Drop zone with mist border; avoid card clutter. Color Hunt paper background.
- Show MIME + size humanized.

## Connections
- Drive API + folder structure: `backend/10`, `database/08`
- Production secrets for Google SA: `production/03`
- Rate limit: 10 uploads/min — surface 429 `retryAfter`

## Acceptance Criteria
- [ ] Upload disabled offline unless queued (Prompt 09)
- [ ] RLS-safe: only own warehouse files listed
- [ ] Accessible drop zone (keyboard activate)
