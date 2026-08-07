# Backup Monitoring & DR Readiness

## Backup Strategy (from database.md)

| Backup Type | Frequency | Retention | Storage |
|------------|-----------|-----------|---------|
| Supabase daily | Daily (automatic) | 7-30 days | Supabase |
| Weekly full export | Sunday 2 AM | Forever | Google Drive Backups/ |
| Daily audit CSV | Midnight | Forever | Google Drive Backups/ |
| PITR | Continuous | 30 days | Supabase Pro |

## Monitoring Setup

| Check | Frequency | Alert On |
|-------|-----------|----------|
| Supabase daily backup | Daily | Missed backup (>26 hours) |
| Weekly full export | Weekly | Missed export |
| Daily audit CSV | Daily | Missed export |
| Restore drill | Quarterly | Missed drill (90 days) |
| PITR configured | Monthly | PITR disabled |

## DR Readiness Checklist
- [ ] Supabase daily backups enabled
- [ ] Point-in-time Recovery configured (Pro plan)
- [ ] Manual backup script running weekly
- [ ] Audit logs backed up daily
- [ ] Recovery procedure documented
- [ ] Admin trained on recovery steps
- [ ] Restore drill completed at least once

## Recovery Scenarios

### Scenario 1: Accidental Data Deletion
1. Use PITR to restore to timestamp before deletion
2. Verify data integrity
3. Resume normal operations

### Scenario 2: Database Corruption
1. Stop application writes
2. Restore from most recent daily backup
3. Apply PITR for any changes since backup
4. Verify with hash chain integrity check

### Scenario 3: Warehouse Soft Delete Recovery
1. Warehouse data preserved for 30 days
2. Restore via `UPDATE warehouses SET deleted_at = NULL WHERE warehouse_id = '...'`
3. Must happen before 30-day purge window

### Scenario 4: Full Recovery
1. Spin up fresh Supabase project
2. Restore from weekly full export
3. Apply any PITR logs
4. Verify RLS policies
5. Update DNS/URLs if needed

## Soft Delete Awareness
- Warehouse soft delete preserves data for 30 days
- Permanent purge job runs after 30 days
- Backup must capture data BEFORE purge window expires
