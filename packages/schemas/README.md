# packages/schemas

Shared package used across apps in this monorepo.

## Guidelines
- Keep this package framework-agnostic unless it is explicitly UI-related.
- Prefer pure functions, typed interfaces, and small modules.
- Treat changes as shared-library changes (review carefully).

## Typical consumers
- `apps/web`
- `apps/api`
- `apps/convex`
- `apps/worker`
