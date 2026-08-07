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
