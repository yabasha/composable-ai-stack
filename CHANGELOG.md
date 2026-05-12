# Changelog

All notable changes to this template are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-12

First tagged cut of the hardened foundation. Safe to fork for production.

### Added
- `@acme/config`: Zod env schema with `NODE_ENV`-conditional required fields, a Node-runtime loader (`dotenv` in non-prod, frozen `env` export), and a separate Convex-side loader (`apps/convex/convex/_lib/env.ts`).
- Convex Auth wiring via `@convex-dev/auth` (Password provider), `SITE_URL` parsed/validated in `auth.config.ts` (https globally, `http://localhost` only locally), and a `requireUser` / `requireUserDoc` guard with `users.me` and `users.updateProfile` example queries.
- Convex schema additions: `users` (with `stripeCustomerId`, `plan`, `planStatus`, `planUpdatedAt`) plus indexes; `processedStripeEvents` for webhook idempotency; auth tables from `@convex-dev/auth/server`.
- Stripe webhook handler at `POST /stripe/webhook`:
  - Async signature verification via `stripe.webhooks.constructEventAsync` (Convex Web-Crypto runtime).
  - Idempotency marker recorded **after** successful processing so failed applies are retried by Stripe.
  - `applySubscriptionChange` throws on unmapped customers so the webhook returns non-2xx and Stripe retries instead of drifting state.
- Next.js Edge middleware with per-request CSP nonces, `'strict-dynamic'`, dev-only `'unsafe-eval'`, and `upgrade-insecure-requests` gated to production. Static security headers (`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, conditional HSTS) in `next.config.ts`.
- Hardened Elysia gateway (`apps/api`):
  - `pino` structured logger with header redaction.
  - Security headers, CORS, bearer guard with `timingSafeEqual` comparison.
  - In-memory rate limit on `/protected/*` with opt-in `trustProxy`, integer-validated `max`/`windowMs`, and a periodic sweep so the key store can't grow unboundedly.
  - Graceful shutdown on `SIGINT`/`SIGTERM`.
- `tooling/scripts/check-versions.ts` extended with `config`, `convex`, `api`, and `web` workspace pin enforcement; `devDependencies` lookups are now strict per category.
- `.env.example` rewritten with the full foundation env surface; `apps/web/.env.local.example` for public envs.
- README: "Scaling the rate limiter" section documenting the Upstash/Redis swap path.

### Tests
- `packages/config` Zod schema tests (defaults, prod-required fields, coercion).
- `apps/convex` `requireUser` and `users.me` / `users.updateProfile` tests via `convex-test`.
- `apps/convex` Stripe webhook tests: missing/invalid signature → 400, valid signature applies plan, replay is idempotent, `subscription.deleted` clears the plan.
- `apps/web` middleware CSP tests including production-vs-development directive presence regressions.

### Fixed
- `mapStatus` preserves numeric error codes and maps `UNAUTHORIZED` → 401, `FORBIDDEN` → 403.
- Root `RootLayout` no longer reads `headers()`, dropping the spurious dynamic-rendering force.
- `apps/web/middleware.ts` declares its own `zod` dependency so CI typecheck doesn't depend on hoisting.

[0.1.0]: https://github.com/yabasha/composable-ai-stack/releases/tag/v0.1.0
