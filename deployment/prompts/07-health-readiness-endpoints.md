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
