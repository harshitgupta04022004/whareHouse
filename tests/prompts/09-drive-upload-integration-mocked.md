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
