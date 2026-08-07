# Prompt 10 — Backup Export Scripts & PITR Checklist

## Role
Operational database reliability per Backup & Recovery Strategy.

## Problem Statement
- Weekly full export script to Storage/S3/Drive Backups folder
- Daily audit_log CSV export
- Document Supabase PITR settings
- Disaster recovery runbook markdown in repo `docs/dr.md`
- Pre-bulk-operation snapshot helper

## Connections
- Production monitoring Prompt 08
- Drive Backups path in folder structure
- Testing restore drill Prompt 10

## Acceptance Criteria
- [ ] Script runnable in CI dry-run
- [ ] Checklist matches database.md Disaster Recovery Checklist
