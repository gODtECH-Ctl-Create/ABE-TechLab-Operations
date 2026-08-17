# Operations database

The SQL migration in `supabase/migrations/0001_operations_core.sql` is the canonical starting schema for the ABE TechLab Operations Supabase project.

## Important

This migration is intended for a **fresh dedicated Operations Supabase project**. Do not run it against the existing Waste2Work project.

## Domains

- Organisations and prospects
- Research requests and sources
- Qualification history
- Leads
- Outreach strategies
- Campaigns and messages
- Email events
- Follow-ups
- Audit events

## Security

Row Level Security (RLS) policies will be added in the next migration after the application roles and authentication model are finalized. The application must not rely on database table visibility alone for authorization.

## Deployment

When the dedicated Supabase project is available, apply migrations through the Supabase migration workflow. Keep schema changes in Git and never commit service-role keys or other secrets.
