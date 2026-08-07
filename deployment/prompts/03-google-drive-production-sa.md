# Prompt 03 — Harden Google Drive Production Service Account

## Role
Productionize the Google Drive integration with least-privilege security.

## Problem Statement
database.md § Drive API Setup specifies:
- Service account must be shared as **Editor** on root Drive folder
- Scopes: `https://www.googleapis.com/auth/drive.file` (upload/manage) + `https://www.googleapis.com/auth/drive.readonly` (read/download)
- Rate limits: 12,000 queries per 100 seconds per project, 10 GB per file, 100 requests per batch

### Production Hardening
1. **Separate SA:** Create a new service account for production (not the legacy migration one)
2. **Least privilege:** Grant only `drive.file` scope (not full `drive` scope)
3. **Root folder:** Share only the `Warehouse Challan` root folder with the SA as Editor
4. **No broad sharing:** Do NOT share entire Drive — only the specific root folder
5. **Key rotation:** Rotate SA key every 90 days; document rotation procedure
6. **IP restriction:** If possible, restrict SA key usage to your server IPs

### Folder Structure Verification
Before going live, verify the folder tree matches database.md:
```
Warehouse Challan/
├── {warehouse_name}/
│   ├── Documents/{user}/{do_number}/
│   ├── Reports/{type}/
│   ├── DOs/
│   └── Shared/{Templates,Rate Lists,Contacts}/
└── Backups/
```

### Monitoring
- Track Drive API quota usage (12,000/100s limit)
- Alert when approaching 80% quota
- Log all 403/429 errors from Drive API
- Monitor file upload success rate

### Production Checklist
- [ ] New SA created (not legacy migration SA)
- [ ] Only `drive.file` scope granted
- [ ] Only root folder shared (not entire Drive)
- [ ] SA key stored in production secrets (not in code)
- [ ] Key rotation schedule documented (90 days)
- [ ] Quota monitoring configured
- [ ] Error alerting for Drive API failures

## Connections
- Backend Drive API (`backend/10`)
- Frontend uploads (`frontend/10`)
- Legacy `drive_folder_id` on warehouses during migration
- Secrets management (`production/01`)
- Backup exports to Drive Backups folder (`database/10`)

## Acceptance Criteria
- [ ] Production SA has minimal required permissions
- [ ] SA key not committed to git
- [ ] Folder structure verified for all warehouses
- [ ] Quota monitoring in place
