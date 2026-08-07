# Prompt 10 — Backup Restore Drill Automation

## Role
Automate the disaster recovery drill that validates backup integrity and restoration procedures.

## Problem Statement
From database.md § Backup & Recovery Strategy:

### Drill Workflow (GitHub Actions `workflow_dispatch`)
1. **Input:** backup artifact path (or "latest")
2. **Spin up** ephemeral Postgres (service container or Supabase branch)
3. **Load** backup SQL dump
4. **Run smoke queries:**
   - `SELECT count(*) FROM warehouses` → must be > 0
   - `SELECT count(*) FROM delivery_orders` → must be > 0
   - `SELECT count(*) FROM audit_log` → must be > 0
5. **Run RLS subset:** cross-warehouse isolation test from testing/02
6. **Run audit integrity:** hash chain verification from testing/06
7. **Run dashboard math:** golden fixtures from testing/07
8. **Publish results:** pass/fail summary in job summary markdown
9. **Cleanup:** destroy ephemeral Postgres

### Recovery Procedure Documentation
The drill also produces a human-readable runbook for operators:
- Scenario 1: Accidental data deletion → PITR restore
- Scenario 2: Database corruption → restore from daily backup
- Scenario 3: Warehouse soft delete → restore within 30 days
- Scenario 4: Full recovery → restore from weekly export

### Cadence
- Manual: on-demand via `workflow_dispatch`
- Automated: quarterly (1st of Jan/Apr/Jul/Oct)
- Alert if no drill run in 90 days

## Connections
- `database/10` (backup exports), `production/08` (backup monitoring)
- RLS tests from `testing/02`, audit from `testing/06`, dashboard from `testing/07`

## Acceptance Criteria
- [ ] `workflow_dispatch` with backup path input works
- [ ] All smoke queries pass against loaded backup
- [ ] RLS isolation verified against restored data
- [ ] Job summary shows clear pass/fail with drill timestamp
