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
