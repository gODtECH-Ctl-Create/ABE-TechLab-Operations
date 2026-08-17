# Audit trail

Every consequential Operations action should produce an audit event.

## Actors

- `human`: user decisions and manual changes
- `aria`: Artificial Intelligence (AI) actions
- `system`: scheduled/background processing
- `provider`: external provider events

## Principles

1. Audit events are append-only at the application level.
2. Business actions should succeed or fail independently from UI rendering.
3. Human approvals/rejections must include the actor and decision metadata.
4. Provider webhook events should retain the normalized event type and provider identifier.
5. Audit records must never contain API keys, passwords, or other secrets.

The database migration exposes `audit_events` for this purpose. The audit service provides the shared application boundary so future domain services do not write audit rows directly.
