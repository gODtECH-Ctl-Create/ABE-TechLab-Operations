# Operations data access

Domain services should depend on `OperationsRepositories` from `repository.ts`, not on Supabase or PostgreSQL directly.

## Development

`createOperationsRepositories()` currently returns the in-memory adapter. This allows the application lifecycle to be exercised without a live database.

## Production integration

The future dedicated Supabase project should provide an adapter implementing the same `OperationsRepositories` contract. The domain layer should not change when that adapter is introduced.

## Current integration helpers

`integrations.ts` provides small application-facing functions for persisting prospects, generating/persisting baseline outreach strategies, and recording audit events. These are intentionally provider-neutral.
