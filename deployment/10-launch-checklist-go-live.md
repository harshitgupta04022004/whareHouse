# Go-Live Launch Checklist

## Pre-Launch (T-7 days)

### Secrets & Environment
- [ ] All secrets rotated (Supabase, Google SA, Upstash)
- [ ] `.env.example` matches production vars
- [ ] No secrets committed to git (gitleaks scan)
- [ ] Vercel env vars configured (production + preview)

### Database
- [ ] All schema migrations applied (01-10)
- [ ] RLS review signed off (see 06-supabase-prod-rls-review.md)
- [ ] PITR enabled and tested
- [ ] Indexes verified with EXPLAIN ANALYZE
- [ ] Connection pooling (Supavisor) configured

### CI/CD
- [ ] CI workflow green on main branch
- [ ] Preview deploy working for PRs
- [ ] Production deploy pipeline tested
- [ ] Smoke tests pass post-deploy

### Frontend
- [ ] All pages functional (login, DOs, items, parties, dashboard, audit, users)
- [ ] Print/PDF working for DOs
- [ ] File upload working
- [ ] Mobile responsive
- [ ] Accessibility basics (keyboard nav, ARIA labels)

### Backend
- [ ] All API endpoints responding correctly
- [ ] Rate limiting active
- [ ] Idempotency working for DO creation
- [ ] Health endpoint returning 200
- [ ] Readiness endpoint checking DB

### Monitoring
- [ ] Sentry integrated (if using)
- [ ] Structured logging in JSON format
- [ ] Alert thresholds configured
- [ ] No PII in log output

### Backup
- [ ] Daily Supabase backups enabled
- [ ] Weekly export script scheduled
- [ ] Audit log export scheduled
- [ ] Restore drill completed once

## Launch Day (T+0)

### Steps
1. Final CI green check
2. Deploy to production
3. Smoke test: `/api/health`, `/api/ready`, login page
4. Verify first user signup/login
5. Create test DO and verify it appears
6. Check dashboard aggregation
7. Test file upload
8. Monitor error rate for 1 hour

### Communication
- Notify users: "The new system is live at [URL]"
- Share login instructions
- Provide support contact

## Post-Launch (T+0 to T+48h)

### Monitoring
- [ ] Watch error budget for 48 hours
- [ ] Monitor rate limit hits
- [ ] Check audit log integrity
- [ ] Verify backup ran successfully
- [ ] Collect user feedback

### Rollback Ready
- [ ] Previous deployment available for rollback
- [ ] Database backup verified
- [ ] Communication plan ready if issues arise

## Sign-off
- Launch date: ________________
- Launched by: ________________
- First 24h status: ________________
- First 48h status: ________________
