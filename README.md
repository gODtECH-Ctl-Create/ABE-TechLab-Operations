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

## Deployment

The production deployment is managed through Vercel from the `main` branch. Build/type-check failures must be resolved before production changes are considered live.

## Security

This repository is private. Secrets must never be committed to GitHub. Production credentials belong in the hosting provider's encrypted environment variables or an approved secrets manager.
