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
