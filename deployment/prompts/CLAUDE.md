# Deployment Prompts

Prompts for production deployment, monitoring, and operations.

## Files in This Directory
1. `01-env-secrets-management.md` — Environment variables, secret rotation
2. `02-deployment-pipeline-preview.md` — GitHub Actions CI/CD pipeline
3. `03-google-drive-production-sa.md` — Google Drive service account hardening
4. `04-cdn-cache-headers-security.md` — CDN caching, security headers
5. `05-observability-logging-alerts.md` — Logging, monitoring, alerting
6. `06-supabase-prod-rls-review.md` — Production RLS policy review
7. `07-health-readiness-endpoints.md` — Health check and readiness probes
8. `08-backup-monitoring-dr-ready.md` — Backup verification, disaster recovery
9. `09-migration-cutover-from-sheets.md` — Google Sheets to web app migration
10. `10-launch-checklist-go-live.md` — Pre-launch checklist, go-live steps

## Build Order
1. `01` (secrets) -> `02` (CI/CD) -> `03-04` (hardening) -> `05-06` (monitoring) -> `07-08` (resilience) -> `09-10` (launch)

## Context
- Database backup: `../database/prompts/10-backup-exports-pit.md`
- API health: `../api/prompts/07-health-readiness-endpoints.md`
- CI tests: `../tests/prompts/05-github-actions-ci-workflow.md`


---

# Imported Prompts

## 01-env-secrets-management.md

# Prompt 01 — Production Environment & Secrets Management

## Role
Platform engineer preparing WareHouse for production configuration.

## Problem Statement
`database.md` lists sensitive keys (Supabase, Google, DATABASE_URL). Production must:
- Use Vercel/Fly/Render + Supabase secrets — **rotate any secrets that were committed to markdown**
- Split `NEXT_PUBLIC_*` vs server-only keys
- Provide `.env.example` with empty placeholders (no real values)
- Document secret rotation runbook
- Block accidental commit via `.gitignore` + optional secret scan in CI (gitleaks)

Warn: values currently present in `database.md` Environment Variables section must be treated as compromised and rotated.

## Connections
- Every frontend/backend runtime
- GitHub Actions secrets for CI
- Google SA JSON never in git

## Acceptance Criteria
- [ ] `.env.example` complete
- [ ] Rotation checklist merged
- [ ] No secrets in client bundle (build inspect script)


---

## 02-deployment-pipeline-preview.md

# Prompt 02 — Deployment Pipeline with Preview Environments

## Role
Set up continuous deployment after CI green.

## Problem Statement
- Preview deploy per PR (Vercel/Netlify)
- Production deploy from `main` with manual approval optional
- Run migrations (`supabase db push` / CI migration job) **before** app traffic switch
- Smoke test URL post-deploy (curl health + login page 200)
- Rollback procedure documented

Reference [MDN HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP) caching headers interaction with CDNs.

## Connections
- Testing CI Prompt 05 gate
- Database migrations Prompts 01–08
- Health endpoint Prompt 07

## Acceptance Criteria
- [ ] Workflow YAML + environment protection rules
- [ ] Migration failure blocks deploy


---

## 03-google-drive-production-sa.md

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


---

## 04-cdn-cache-headers-security.md

# Prompt 04 — CDN Cache Headers, CSP & Security Headers

## Role
Implement Browser Caching Strategy + security headers for production.

## Problem Statement
From `database.md` caching section + modern hardening:
- Immutable hashed static assets: long `Cache-Control`
- HTML/document: no long public cache
- API: `private, no-store` for authenticated JSON
- Security headers: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- Optional service worker carefully scoped (do not cache authenticated API blindly)

Use Next.js `headers()` in `next.config` and verify with browser Network panel / [MDN Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control).

## Connections
- Frontend offline Prompt 09
- CDN in front of deploy Prompt 02

## Acceptance Criteria
- [ ] Header checklist tested on staging
- [ ] CSP allows Supabase + Drive domains only as needed


---

## 05-observability-logging-alerts.md

# Prompt 05 — Observability: Structured Logging, Metrics & Alerts

## Role
Add production observability without leaking PII — the eyes and ears of the running system.

## Problem Statement
From database.md § Error Handling and § Rate Limiting: errors and rate limit hits must be logged and monitored.

### Structured Logging
- Every request gets a `request_id` (UUID) that matches the `audit_log.request_id`
- Log format: JSON with timestamp, level, request_id, user_id, message, metadata
- Never log: passwords, tokens, full emails, IP addresses (PII)
- Log levels: ERROR (failures), WARN (rate limits, retries), INFO (normal ops), DEBUG (dev only)

### Error Tracking (Sentry or similar)
- Capture unhandled exceptions with context
- Scrub PII before sending (emails → `u***@domain.com`)
- Alert on error rate spike (> 5% of requests)
- Tag errors with warehouse_id for tenant-scoped debugging

### Key Metrics
| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| DO create rate | audit_log | > 100/min (abuse) |
| 429 rate limit hits | rate limiter | > 20/min |
| RLS denial count | Postgres logs | > 5/min |
| Drive API failures | backend logs | > 3/min |
| Auth lockout count | auth logs | > 10/hour |
| Error rate | Sentry | > 5% of requests |
| API response p99 | APM | > 2 seconds |
| Cache hit rate | frontend metrics | < 80% (target > 80%) |

### Alerts
- **PagerDuty/Slack:** error rate spike, RLS denials, Drive failures
- **Email digest:** daily summary of errors and rate limit hits
- **Weekly:** backup success/failure, drill cadence

### Dashboard
- Real-time error rate chart
- Request volume by endpoint
- Rate limit hit frequency
- Warehouse-scoped error breakdown

## Connections
- Audit log (`database/04`) is the canonical record
- Rate limiter (`backend/09`) logs hits
- Backup monitoring (`production/08`) feeds into alerting
- Error handling (`backend/11`) produces structured errors

## Acceptance Criteria
- [ ] Structured logs in JSON format
- [ ] Sentry integrated with PII scrubbing
- [ ] Alert thresholds documented and configured
- [ ] No PII in any log output


---

## 06-supabase-prod-rls-review.md

# Prompt 06 — Supabase Production Hardening & RLS Review Gate

## Role
Pre-launch database production checklist — the final security sign-off before real users.

## Problem Statement
Before any real user data enters the system, verify every security control.

### RLS Review Checklist
- [ ] RLS enabled on ALL 8 tables (warehouses, app_users, parties, items, delivery_orders, do_items, audit_log, files)
- [ ] `current_warehouse_id()` function deployed and working
- [ ] Each table has correct policies (match database.md § RLS exactly)
- [ ] `audit_log` UPDATE/DELETE revoked from `authenticated` role
- [ ] `anon` role has no access to business tables
- [ ] Cross-warehouse SELECT returns zero rows (manual test)
- [ ] Cross-warehouse INSERT fails (manual test)

### Grants Review
- `authenticated` role: SELECT on views (product_summary, item_totals), ALL on business tables (subject to RLS)
- `service_role`: used only in server-side code (backend API routes)
- `anon`: no access to any business table

### Connection Pooling
- Enable Supavisor (Supabase connection pooler) for serverless
- Connection limit per project tier documented
- PgBouncer not needed (Supavisor replaces it)

### PITR (Point-in-time Recovery)
- Enable on Pro plan (30-day retention)
- Verify PITR works by restoring to a specific timestamp in staging
- Document recovery procedure for operators

### Performance
- Verify indexes exist for all query patterns
- Run `EXPLAIN ANALYZE` on key queries (DO list, dashboard)
- Confirm no full table scans on hot paths

### Sign-off
- Engineer signs off with date and name
- Staging parity confirmed (same schema, same RLS, same indexes)
- Any deviations documented and approved

## Connections
- All database prompts (01–10) must be complete before this review
- Testing Prompt 02 (RLS suite) must pass against staging
- Production Prompt 02 (deploy) blocked until this sign-off

## Acceptance Criteria
- [ ] All checklist items verified
- [ ] Cross-warehouse isolation manually tested
- [ ] PITR tested in staging
- [ ] Sign-off document completed


---

## 07-health-readiness-endpoints.md

# Prompt 07 — Health, Readiness & Dependency Check Endpoints

## Role
Implement `/api/health` and `/api/ready` for uptime monitors, load balancers, and deployment smoke tests.

## Problem Statement
From database.md § Error Handling: connection failures must be detected quickly.

### `/api/health` (Liveness)
- Returns 200 with `{ status: "ok", timestamp: "..." }`
- No dependency checks — just confirms the process is running
- Use for load balancer health checks

### `/api/ready` (Readiness)
- Checks actual dependencies:
  - Postgres: `SELECT 1` via Supabase client
  - Google Drive: optional metadata ping (or skip if slow)
- Returns 200 `{ status: "ready", db: "ok", drive: "ok" }`
- Returns 503 `{ status: "not_ready", db: "error", drive: "ok" }` if any dependency fails
- Never expose secret details in the response

### Response Shapes
```json
// 200 OK
{ "status": "ok", "version": "1.0.0", "timestamp": "2026-08-08T01:00:00Z" }

// 200 Ready
{ "status": "ready", "db": "ok", "drive": "ok", "uptime": 3600 }

// 503 Not Ready
{ "status": "not_ready", "db": "error: connection refused", "drive": "ok" }
```

### Uptime Monitoring
- Configure Better Stack / UptimeRobot / similar
- Check `/api/ready` every 60 seconds
- Alert on 2 consecutive failures
- Status page for public visibility (optional)

### Deployment Smoke Test
After deploy:
1. Wait for health endpoint to return 200
2. Check login page renders (GET `/` returns 200)
3. If either fails → automatic rollback

## Connections
- Deploy pipeline (`production/02`) runs smoke tests post-deploy
- Observability (`production/05`) monitors health endpoint
- Load balancer config uses `/api/health`

## Acceptance Criteria
- [ ] `/api/health` returns 200
- [ ] `/api/ready` checks Postgres connection
- [ ] 503 returned when DB is unreachable
- [ ] No secrets in health response


---

## 08-backup-monitoring-dr-ready.md

# Prompt 08 — Backup Monitoring & DR Readiness Gate

## Role
Ensure the backup strategy from database.md § Backup & Recovery is production-complete.

## Problem Statement
database.md defines:
- Daily backups (Supabase automatic)
- Weekly full export (Sunday 2 AM)
- Daily audit log export (midnight)
- PITR on Pro plan

### Backup Verification
- Verify daily Supabase backup exists (check Supabase dashboard API or logs)
- Verify weekly export script ran (check for artifact in storage/Drive Backups)
- Verify daily audit CSV exported
- Alert if any backup missed for > 26 hours

### Monitoring Setup
| Check | Frequency | Alert On |
|-------|-----------|----------|
| Supabase daily backup | Daily | Missed backup |
| Weekly full export | Weekly (Sunday) | Missed export |
| Daily audit CSV | Daily | Missed export |
| Restore drill | Quarterly | Missed drill (90 days) |
| PITR configured | Monthly | PITR disabled |

### DR Readiness Checklist
From database.md § Disaster Recovery Checklist:
- [ ] Supabase daily backups enabled
- [ ] Point-in-time Recovery configured (Pro plan)
- [ ] Manual backup script running weekly
- [ ] Audit logs backed up daily
- [ ] Recovery procedure documented and tested
- [ ] Admin trained on recovery steps

### Soft Delete Awareness
- Warehouse soft delete preserves data for 30 days
- Permanent purge job (`database/09`) runs after 30 days
- Backup must capture data BEFORE purge window expires

## Connections
- Backup exports (`database/10`)
- Restore drill (`testing/10`)
- Purge job (`database/09`)
- Observability alerts (`production/05`)

## Acceptance Criteria
- [ ] Alert fires if no backup in 26 hours
- [ ] DR checklist all items verified
- [ ] Restore drill completed at least once
- [ ] PITR confirmed working in staging


---

## 09-migration-cutover-from-sheets.md

# Prompt 09 — Google Sheets → Supabase Cutover Runbook

## Role
Write and automate the production cutover from the legacy Google Sheets model to WareHouse.

## Problem Statement
database.md was written to replace Google Sheets. The cutover must be safe and reversible.

### Pre-Cutover
1. **Data Export from Sheets:** Export all warehouses, users, items, parties, DOs, do_items from existing Google Sheets
2. **Data Cleansing:** Remove duplicates, fix date formats, validate DO numbers
3. **Schema Migration:** Run all database prompts (01–10) on production Supabase
4. **Import Data:** Load cleansed data into Supabase tables
5. **Verify Counts:** Row counts match between Sheets and Supabase
6. **Preserve Legacy References:** Keep `spreadsheet_id` and `drive_folder_id` on warehouses for dual-run period

### Dual-Run Period (T+0 to T+72h)
- App writes to Supabase (primary)
- Sheets kept in read-only mode (backup reference)
- Monitor for data discrepancies
- Users can report issues

### Cutover (T+72h)
- Freeze Sheets permanently (read-only for all users)
- App becomes sole source of truth
- Remove legacy `spreadsheet_id`/`drive_folder_id` columns (database/01 migration)

### Rollback (if critical defect in T+24h)
- Re-enable Sheets writes
- Export new data from Supabase back to Sheets
- Revert app to Sheets API (previous codebase)
- Communicate to users

### Communication Templates
- Pre-cutover: "We're upgrading to a new system on [date]. Your data will be preserved."
- Cutover day: "The new system is live. Please use [app URL] instead of Sheets."
- Post-cutover: "Legacy Sheets access has been retired. All data is in the new system."

### Validation Queries
```sql
-- Verify DO counts match
SELECT count(*) FROM delivery_orders WHERE warehouse_id = '...';

-- Verify item totals match
SELECT * FROM product_summary WHERE warehouse_id = '...';

-- Verify audit log has import entries
SELECT count(*) FROM audit_log WHERE action = 'import';
```

## Connections
- Schema migrations (database/01–10)
- Data import uses backend APIs or direct SQL
- Drive folder structure preserved (`database/08`)
- Legacy `spreadsheet_id` on warehouses

## Acceptance Criteria
- [ ] Dry-run on staging with production-scale data
- [ ] Row count reconciliation report
- [ ] Rollback procedure tested
- [ ] Communication templates ready


---

## 10-launch-checklist-go-live.md

# Prompt 10 — Go-Live Launch Checklist (Production Integration Ready)

## Role
Final integration owner. Produce a single go-live checklist that ties every layer together.

## Problem Statement
Create `docs/GO_LIVE.md` covering:
1. Secrets rotated; env set
2. Migrations applied; RLS review signed
3. CI green on release tag
4. Preview + staging sign-off (auth, DO create, dashboard, upload, audit)
5. Monitoring & backups verified
6. Support contacts; feature flags if any
7. Post-launch: watch error budget 48h

Include UX polish pass: Color Hunt tokens consistent; forms still meet [MDN accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility) basics.

## Connections
- Depends on completion signals from frontend/backend/database/testing prompts
- Cutover Prompt 09 executed or scheduled

## Acceptance Criteria
- [ ] Checklist with owners + dates
- [ ] Explicit “integration ready for production” sign-off section


---

