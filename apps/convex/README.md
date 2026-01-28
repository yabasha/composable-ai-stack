# apps/convex

Convex backend (schema, queries, mutations, actions, and HTTP endpoints).

## What lives here
- `convex/schema.ts` — database schema
- `convex/http.ts` — HTTP endpoints (e.g. Stripe webhooks)
- `convex/*` — queries/mutations/actions

## Dev

```bash
bun run dev:convex
```

## Deploy

```bash
bun run --cwd apps/convex deploy
```
