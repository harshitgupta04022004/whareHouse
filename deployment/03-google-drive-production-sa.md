# Google Drive Production Service Account — Hardening Guide

## Overview
Production Google Drive integration requires a least-privilege service account.

## Setup Steps

### 1. Create Dedicated Production SA
- Go to Google Cloud Console → IAM → Service Accounts
- Create new SA (NOT the legacy migration one)
- Name: `warehouse-drive-prod@PROJECT_ID.iam.gserviceaccount.com`

### 2. Grant Minimal Scopes
- `https://www.googleapis.com/auth/drive.file` (upload/manage own files)
- `https://www.googleapis.com/auth/drive.readonly` (read/download)
- Do NOT grant full `drive` scope

### 3. Share Only the Root Folder
- Open the `Warehouse Challan` root folder in Google Drive
- Share with the SA email as **Editor**
- Do NOT share the entire Drive

### 4. Store Key Securely
- Download the SA JSON key
- Store in Vercel/production secrets as `GOOGLE_SERVICE_ACCOUNT_JSON`
- NEVER commit to git

### 5. Key Rotation (Every 90 Days)
1. Generate new key in Google Cloud Console
2. Update `GOOGLE_SERVICE_ACCOUNT_JSON` in production secrets
3. Verify file upload/download still works
4. Delete old key

## Folder Structure
```
Warehouse Challan/
├── {warehouse_name}/
│   ├── Documents/{user}/{do_number}/
│   ├── Reports/{type}/
│   ├── DOs/
│   └── Shared/{Templates,Rate Lists,Contacts}/
└── Backups/
```

## Monitoring
- Track Drive API quota: 12,000 queries per 100 seconds
- Alert at 80% quota usage
- Log all 403/429 errors
- Monitor upload success rate

## Checklist
- [ ] New SA created (not legacy)
- [ ] Only `drive.file` scope granted
- [ ] Only root folder shared
- [ ] SA key in production secrets
- [ ] Key rotation scheduled (90 days)
- [ ] Quota monitoring configured
- [ ] Error alerting for Drive API failures
