# Temporary Local Data Mode

Supabase is intentionally not required for the first application build because the ABE TechLab Operations Supabase project has not yet been created.

Until it is available, the application may use typed mock repositories from `lib/data/mock-data.ts`.

## Rules

- Mock data is development/demo data only.
- No production secrets belong in the repository.
- Components should consume domain types and repository interfaces, not hard-code records directly in UI components.
- The eventual Supabase adapter should implement the same repository contracts.
- Existing Waste2Work Supabase infrastructure must not be used as a substitute database.

## Migration path

`mock repository → Supabase repository`

The dashboard and ARIA workflows should not need to change when the backing store changes.
