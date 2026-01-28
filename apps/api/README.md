# apps/api

Optional **ElysiaJS** service (Bun runtime). Keep this as a "future lane" for:
- Stripe webhooks that you prefer outside Convex
- OAuth callbacks
- API gateway patterns
- Custom streaming endpoints (SSE)
- Advanced rate limiting & middleware

If you're going Convex-only, you can ignore this folder until you need it.

## Dev

```bash
bun run dev:api
```

## Health check

- `GET /health`
