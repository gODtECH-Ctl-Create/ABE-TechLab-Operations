# ABE TechLab Operations

Private internal operations platform for ABE TechLab.

## Purpose

ABE TechLab Operations is the foundation for the company's internal AI-assisted operating system. It will connect the public ABE TechLab website with lead intelligence, customer relationship management (CRM), research, outreach, content operations, analytics, and ARIA.

## ARIA

ARIA is the AI intelligence layer inside ABE TechLab Operations. ARIA is not the whole platform. It will research, classify, recommend, draft, monitor, and eventually execute approved low-risk actions through controlled tools.

## Initial architecture

- **Dashboard:** internal operations workspace
- **CRM:** organisations, contacts, leads, opportunities, activities
- **Research:** organisation and market intelligence
- **Outreach:** approved communication plans and follow-ups
- **Content:** insights and social content pipeline
- **ARIA:** AI reasoning, recommendations, agents, prompts, and tools
- **Integrations:** website, email, analytics, social platforms, GitHub, and future services

## Operating principle

> AI proposes → ABE TechLab reviews → approved actions execute → results return to the system.

Autonomous actions will be introduced gradually. High-impact external actions remain approval-gated until they are proven reliable.

## Roadmap

### Operations Core v0.1

1. Application foundation
2. Authentication and access control
3. Operations dashboard
4. Organisation and contact records
5. Lead and opportunity pipeline
6. Activity/event log
7. Public website lead intake
8. Initial ARIA workspace
9. Environment and secrets management
10. Documentation and GitHub issue workflow

### ARIA v0.2

- Organisation research
- Lead qualification
- Opportunity scoring
- Service recommendations
- Outreach-plan generation
- Follow-up recommendations

### Automation v0.3

- Content pipeline
- Social publishing workflows
- Email workflows
- Scheduled jobs
- Analytics and reporting

## Supabase heartbeat

The Operations platform includes a lightweight health endpoint designed to keep the connected Supabase project receiving regular database activity without writing business records.

### Endpoint

```text
GET https://abe-tech-lab-operations.vercel.app/api/health/supabase
```

The endpoint performs a single read against the isolated `system_heartbeat` table and returns:

- `200` when the Supabase query succeeds
- `503` when the database request fails
- `401` when `CRON_SECRET` is configured and the request is not authenticated with the expected Bearer token

The heartbeat table contains one fixed row and is protected with Row Level Security (RLS). No heartbeat row is created for each request.

### Scheduled execution

The repository contains a Vercel Cron Job in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/health/supabase",
      "schedule": "0 3 * * *"
    }
  ]
}
```

This runs once per day at approximately 03:00 UTC. The project is currently on Vercel's Hobby plan, whose Cron Jobs are limited to daily execution. Supabase's current guidance says a few user database requests each day typically keeps a Free Plan project from being paused.

Vercel registers Cron Jobs from production deployments only, not preview deployments.

### Supabase migration

The heartbeat table is created by:

```text
supabase/migrations/20260902203000_add_system_heartbeat.sql
```

Apply the migration to the connected Supabase project before relying on the heartbeat endpoint.

### Cron security

For production hardening, configure a random `CRON_SECRET` environment variable in Vercel. The endpoint will then require:

```text
Authorization: Bearer <CRON_SECRET>
```

Vercel documents `CRON_SECRET` as the recommended way to secure Cron Job invocations.

## Deployment

The production deployment is managed through Vercel from the `main` branch. Build/type-check failures must be resolved before production changes are considered live.

Production project:

```text
https://abe-tech-lab-operations.vercel.app
```

## Security

This repository is private. Secrets must never be committed to GitHub. Production credentials belong in the hosting provider's encrypted environment variables or an approved secrets manager.
