# Settings architecture

Settings is intentionally split into four areas:

- `/profile` for the signed-in user's identity and account context.
- `/settings/team` for workspace members, roles and permission policy.
- `/settings/notifications` for operational alert preferences.
- `/settings/security` for authentication and access posture.
- `/settings/integrations` for connected systems.
- `/settings/integrations/ai` for the AI Control Centre.

The legacy `/ai` route redirects to `/settings/integrations/ai` so old links remain valid.

## Backend-dependent follow-up

Two capabilities require the correct dedicated Operations Supabase project and server-side authentication administration configuration before they should be treated as production controls:

1. Inviting new users and changing their authenticated role.
2. Persisting per-user notification preferences.

The current UI makes those boundaries explicit rather than pretending those controls are active.
