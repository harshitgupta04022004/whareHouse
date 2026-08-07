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
