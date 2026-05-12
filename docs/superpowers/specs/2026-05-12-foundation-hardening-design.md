# Foundation Hardening — Design

**Date:** 2026-05-12
**Scope:** Sub-project 1 of 6 from the `/audit composable-ai-stack` follow-up.
**Goal:** make the template's defaults safe to fork. Close the Critical and High security findings from the audit, and put env validation + Convex auth in place so every later sub-project can build on a real foundation.

## Out of scope

- `packages/prompts` runtime, `packages/ai` typed tools, `packages/evals` harness, `packages/schemas` base — Sub-project 2 (AI runtime core).
- `conversations`, `messages`, `toolCalls`, `evalRuns`, `promptVersions` tables and multi-tenant `workspaceId` columns — Sub-project 3 (Convex AI schema).
- Chat demo, `next-themes`, loading/error/not-found pages, `<nav>` header, SSE endpoint — Sub-project 4 (App shell + chat demo).
- Landing-page token migration, `next/font`, brand differentiation, button hover fix — Sub-project 5 (Landing polish).
- Root `package.json` rename, `@acme/*` → `@cas/*` rename, `apps/api/package.json` lint placeholder, `package.json` `exports` fields, `check-versions.ts` `import.meta.dir` fix — Sub-project 6 (DX cleanup).

## Decisions (locked)

- **Env strictness:** strict by `NODE_ENV` — required in `production`, optional in `development`/`test`. Throws at module load.
- **Stripe scope:** verify signature + raw body + replay window + idempotency table, plus minimal sync of `customer.subscription.{created,updated,deleted}` to `users.planStatus`/`users.plan`.
- **Auth provider:** `@convex-dev/auth` with the `Password` provider as the only built-in. Other providers documented but not wired.
- **CSP:** strict directives with per-request nonces issued by `apps/web/middleware.ts`. `'strict-dynamic'` for scripts, nonced styles.
- **Elysia surface:** hardened skeleton — CORS, security headers, structured logger, bearer guard on `/protected/*`, in-memory rate limit, `onError`, graceful shutdown, `PORT` from env. No SSE.
- **Rate-limit store:** in-memory `Map` with `X-RateLimit-Backend: memory` and a swap-to-Redis comment + README note.
- **Tests:** Bun test suites covering env loader, Stripe webhook, `withUser` helper, and CSP middleware.
- **`.env.example`:** Foundation-only envs (Convex, Stripe, app URL, API bearer/port, log level, webhook tolerance). No AI provider keys yet.
- **Env architecture:** shared Zod schema in `packages/config`, two parse sites — Node loader for Next/Elysia/Worker, Convex-side loader in `apps/convex/convex/_lib/env.ts`.

## Section 1 — `packages/config` env module

### Files

- `packages/config/src/schema.ts` — exports `envSchema` (Zod) and `parseEnv(input, mode)`. Pure, no I/O, no Node-only imports. Safe to import from the Convex runtime.
- `packages/config/src/node.ts` — Node loader: `import "dotenv/config"` (dev only, guarded on `NODE_ENV !== "production"`), then `parseEnv(process.env, process.env.NODE_ENV)`, throws on failure. Exports typed `env`.
- `packages/config/src/index.ts` — re-exports from `node.ts`. The default import path for Next/Elysia/Worker.
- `apps/convex/convex/_lib/env.ts` — imports `envSchema` from `@cas/config/schema`, runs `.parse(process.env)` inside the Convex runtime, exports typed `env`. Convex functions import from here, never from `@cas/config`.

### Schema fields

| Field | Type | Required in production | Default |
|---|---|---|---|
| `NODE_ENV` | `"development"\|"test"\|"production"` | always | — |
| `STRIPE_SECRET_KEY` | string | yes | — |
| `STRIPE_WEBHOOK_SECRET` | string | yes | — |
| `CONVEX_DEPLOYMENT` | string | yes | — |
| `NEXT_PUBLIC_CONVEX_URL` | URL string | yes | — |
| `NEXT_PUBLIC_APP_URL` | URL string | yes | — |
| `API_BEARER_TOKEN` | string (min 32) | yes | — |
| `WEBHOOK_TOLERANCE_SECONDS` | number coerced from string | no | `300` |
| `API_PORT` | number coerced from string | no | `3001` |
| `LOG_LEVEL` | `"debug"\|"info"\|"warn"\|"error"` | no | `"info"` |

### Behavior

- `parseEnv` uses `envSchema.superRefine` to enforce required-in-production fields conditionally on the `mode` argument.
- `node.ts` calls `parseEnv` once at module load. The resulting `env` is frozen with `Object.freeze`.
- Parse errors throw with the Zod issue path so missing/invalid fields are named in the stack trace.

### Dependencies (pinned)

- `zod@3.23.8` added to `packages/config/package.json`.
- `dotenv@16.4.7` added to `packages/config/package.json`.
- Both names added to `tooling/scripts/check-versions.ts` so version drift fails CI.

## Section 2 — Stripe webhook (Convex)

### Replaces

`apps/convex/convex/http.ts:8-14` — the 200-without-verify stub.

### New files

- `apps/convex/convex/_lib/stripe.ts` — `getStripe()` returns a lazy-initialized `Stripe` client using `env.STRIPE_SECRET_KEY`. `apiVersion` pinned to the current Stripe SDK default for the pinned `stripe` dep.
- `apps/convex/convex/_lib/env.ts` — Convex-side env loader (Section 1).
- `apps/convex/convex/stripe.ts` — internal mutations:
  - `recordEvent(eventId, type)` — inserts into `processedStripeEvents`; returns `false` if duplicate via unique index.
  - `applySubscriptionChange({ stripeCustomerId, status, plan })` — looks up user by `stripeCustomerId`, writes `planStatus`, `plan`, `planUpdatedAt`.

### Handler shape

`apps/convex/convex/http.ts` registers `POST /stripe/webhook`:

1. `const body = await request.text();` — raw body, never `.json()`.
2. Read `Stripe-Signature` header. Missing → return `400`.
3. `stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET, env.WEBHOOK_TOLERANCE_SECONDS)` inside `try/catch`. `StripeSignatureVerificationError` → `400`.
4. `await ctx.runMutation(internal.stripe.recordEvent, { eventId, type })`. Returns `false` if already processed → respond `200` immediately (idempotent replay).
5. Switch on `event.type`:
   - `customer.subscription.created`, `customer.subscription.updated` → `applySubscriptionChange({ stripeCustomerId, status: subscription.status, plan: subscription.items.data[0]?.price.lookup_key ?? subscription.items.data[0]?.price.id })`.
   - `customer.subscription.deleted` → `applySubscriptionChange({ stripeCustomerId, status: "canceled", plan: null })`.
   - Anything else → log `"unhandled event type"` with the type, return `200`.
6. Return `200` with `{ received: true }`.

### Schema additions (`apps/convex/convex/schema.ts`)

- New table `processedStripeEvents`:
  - `eventId: v.string()`
  - `type: v.string()`
  - `processedAt: v.number()`
  - Index `by_eventId` on `["eventId"]`. Convex has no unique-index constraint, so `recordEvent` does a "read by index, return false if found, else insert" inside one mutation. Concurrent webhook deliveries for the same `eventId` could theoretically both pass the read and both insert; in practice Stripe retries are sequential, not concurrent, so the race is acceptable for a template. Forks needing strict uniqueness can switch to a `withIndex` + transactional check pattern.
- `users` table gains:
  - `plan: v.optional(v.string())`
  - `planUpdatedAt: v.optional(v.number())`

`stripeCustomerId` and `planStatus` already exist on `users` and are reused.

### Failure modes

- Invalid signature → `400`, no DB write.
- Missing required env → `_lib/env.ts` throws at module load; the deploy fails before any request lands.
- Unknown event type → `200`, logged at `info`. Stripe expects 2xx for unhandled types or it will retry indefinitely.
- Convex mutation conflict (rare) → bubbles up as `500`; Stripe will retry per its standard backoff.

### Dependencies (pinned)

- `stripe@<pinned version>` added to `apps/convex/package.json`. Added to `check-versions.ts`.

## Section 3 — Convex Auth pattern + schema columns

### New files

- `apps/convex/convex/auth.ts` — calls `convexAuth({ providers: [Password] })` and re-exports `auth.addHttpRoutes`, `getAuthUserId`, `store`. Comment block points at Convex Auth docs for adding GitHub/Google/etc.
- `apps/convex/convex/auth.config.ts` — required Convex Auth config; `providers: [{ domain: process.env.SITE_URL!, applicationID: "convex" }]` per Convex Auth convention. `SITE_URL` is a Convex-runtime-only env set via `bunx convex env set SITE_URL <url>`; it is **not** part of `@cas/config`'s schema because it never reaches Next/Elysia/Worker.
- `apps/convex/convex/_lib/withUser.ts` — guard helpers:
  - `requireUser(ctx)` → returns `userId` or throws `ConvexError({ code: "UNAUTHENTICATED" })`.
  - `requireUserDoc(ctx)` → `requireUser` plus `ctx.db.get(userId)` with a not-found throw.
- `apps/convex/convex/users.ts` — example authenticated functions:
  - `query me()` → returns `requireUserDoc(ctx)`.
  - `mutation updateProfile({ name })` → `requireUser`, validates with `v.string()`, writes `name` to the user doc.

### `http.ts` change

The same `http` router that mounts the Stripe webhook calls `auth.addHttpRoutes(http)`. Stripe stays unauthenticated (Stripe signs it); auth routes mount under `/api/auth/*`. The two coexist on one router.

### Schema additions

- `users` table gains:
  - `tokenIdentifier: v.optional(v.string())` (set by Convex Auth on signup)
  - `name: v.optional(v.string())`
  - `image: v.optional(v.string())`
- New index `by_token` on `["tokenIdentifier"]`.
- The Convex Auth tables (`authSessions`, `authAccounts`, `authVerificationCodes`, `authVerifiers`, `authRateLimits`) are spread in via `...authTables` per Convex Auth convention.

### Multi-tenant deferred

`workspaceId` columns and tenant-scoped queries are explicitly out of scope. Every query in this pass is scoped by `userId`. Sub-project 3 introduces tenancy.

### Dependencies (pinned)

- `@convex-dev/auth@<latest>` added to `apps/convex/package.json`. `@auth/core` as a peer if required by the version. Added to `check-versions.ts`.

## Section 4 — Next.js security headers + CSP nonces

### New files

- `apps/web/middleware.ts`
  - Generates per-request nonce: 16 random bytes via `crypto.getRandomValues`, base64.
  - Sets request header `x-nonce` (consumed in RSC via `headers()`).
  - Sets response `Content-Security-Policy` with the nonce interpolated.
  - `config.matcher` excludes `/_next/static`, `/_next/image`, `/favicon.ico`, and the `/public` paths.
- `apps/web/next.config.ts`
  - `async headers()` returning the static headers that don't need a nonce.
  - Conditional HSTS only when `NODE_ENV === "production"`.

### CSP directives — production

```text
default-src 'self';
script-src 'self' 'nonce-{n}' 'strict-dynamic';
style-src 'self' 'nonce-{n}';
img-src 'self' blob: data:;
font-src 'self' data:;
connect-src 'self' {NEXT_PUBLIC_CONVEX_URL} {wss equivalent};
frame-src 'none';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

Stripe and analytics origins deliberately omitted — left as a `// TODO(fork):` comment in `middleware.ts` so forks add the origins they actually need.

### CSP directives — development

Same as production with two relaxations:

- `script-src` adds `'unsafe-eval'` (Next/React HMR requires it).
- `connect-src` adds `ws://localhost:*` and `http://localhost:*`.

`middleware.ts` runs in the Edge runtime, which forbids Node-only APIs. It must import from `@cas/config/schema` (the pure Zod module), **not** from `@cas/config` (the Node loader uses `dotenv`). The middleware calls `envSchema.parse(process.env)` directly. `process.env` is available in the Edge runtime; `dotenv` is not.

### Static headers (`next.config.ts`)

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (prod only)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- `X-Frame-Options: DENY` (defense in depth alongside `frame-ancestors 'none'`)

### Nonce consumption

`apps/web/app/layout.tsx` reads `headers().get("x-nonce")` and passes it to any `<Script>` it renders. The current landing has no third-party scripts, so the wiring exists but is unused — ready for forks.

## Section 5 — Elysia hardening (`apps/api`)

### Replaces

`apps/api/src/index.ts:7-9` — `/health` only, hardcoded port `3001`.

### File layout

- `apps/api/src/env.ts` — re-exports `env` from `@cas/config`. Keeps imports stable.
- `apps/api/src/logger.ts` — `pino` instance. `level: env.LOG_LEVEL`. `pino-pretty` transport when `NODE_ENV !== "production"`. Redacts `req.headers.authorization`, `req.headers.cookie`, and any `*.password` field.
- `apps/api/src/middleware/security-headers.ts` — Elysia plugin setting `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS in prod. (Equivalent to a helmet subset; in-repo to avoid pinning another plugin.)
- `apps/api/src/middleware/rate-limit.ts` — in-memory limiter:
  - `Map<string, { count: number; resetAt: number }>` keyed by `bearer ?? ip`. IP from `request.headers.get("x-forwarded-for")?.split(",")[0].trim()` or `server.requestIP(request)?.address`.
  - Defaults: 60 s window, 60 requests per window. Configurable per route via plugin options.
  - Sets `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `X-RateLimit-Backend: memory`.
  - On breach: `429` with `Retry-After`.
  - File header comment: "Replace with Redis/Upstash for multi-worker deployments. See README." README gets a `## Scaling the rate limiter` subsection.
- `apps/api/src/middleware/bearer-guard.ts` — wraps `@elysiajs/bearer`. Constant-time compare via `crypto.timingSafeEqual` over Buffer-wrapped tokens of equal length. Reject `401` on mismatch or missing token.
- `apps/api/src/index.ts` — composes the app:
  - `.use(securityHeaders)`
  - `.use(cors({ origin: env.NEXT_PUBLIC_APP_URL, credentials: true, methods: ["GET","POST","OPTIONS"], allowedHeaders: ["authorization","content-type"] }))`
  - `.onRequest(({ request }) => logger.info({ method: request.method, url: request.url, reqId }))`
  - `.onError(({ error, code, set }) => { logger.error({ err: error, code }); set.status = mapCode(code); return { error: { code, message: prodSafeMessage(error) } }; })`
  - `.get("/health", () => ({ ok: true }))`
  - `.group("/protected", a => a.use(bearerGuard).use(rateLimit({ max: 60, windowMs: 60_000 })).get("/me", ({ bearer }) => ({ token: "ok" })))`
  - `.listen({ port: env.API_PORT, hostname: "0.0.0.0" })`
- **Graceful shutdown:** `process.on("SIGTERM", () => app.stop())` and `SIGINT` handler. 10 s drain timeout.

### Error mapping

- `VALIDATION` → 400
- `NOT_FOUND` → 404
- `PARSE` → 400
- everything else → 500

Response body shape: `{ error: { code, message } }`. Stack traces only logged server-side.

### Dependencies (pinned)

Added to `apps/api/package.json` and `check-versions.ts`:

- `@elysiajs/cors@<latest>`
- `@elysiajs/bearer@<latest>`
- `pino@<latest>`
- `pino-pretty@<latest>` (devDependency)

## Section 6 — `.env.example` rewrite

```dotenv
# ─── Required in production ────────────────────────────────────
NODE_ENV=development

# Convex — from `bunx convex dev` output
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=

# Web app origin (used by API CORS + CSP connect-src)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe — required for the webhook handler
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Elysia gateway
API_BEARER_TOKEN=
API_PORT=3001

# ─── Optional ──────────────────────────────────────────────────
WEBHOOK_TOLERANCE_SECONDS=300
LOG_LEVEL=info

# ⚠️ NEVER commit a real .env file. For Convex secrets, use
#    `bunx convex env set <NAME> <VALUE>` — they live in the Convex
#    dashboard, not in this file.
```

`apps/web/.env.local.example` mirrors only the `NEXT_PUBLIC_*` subset (Next.js convention).

## Section 7 — Tests

All tests live in the workspace they verify. Each workspace gets `"test": "bun test"` in its `package.json`. `turbo.json:27` already declares the `test` task; this pass makes it do real work.

### `packages/config/src/schema.test.ts`

- Valid dev env → returns typed object with defaults applied.
- `NODE_ENV=production` + missing `STRIPE_SECRET_KEY` → throws; error message names the field.
- Optional fields apply defaults: `WEBHOOK_TOLERANCE_SECONDS=300`, `API_PORT=3001`, `LOG_LEVEL=info`.
- Invalid `NODE_ENV` value → throws.

### `apps/convex/convex/http.test.ts` (uses `convex-test`)

- POST `/stripe/webhook` with no `Stripe-Signature` → `400`.
- POST with valid-looking signature but tampered body → `400`.
- POST with valid signature and fresh `event.id` → `200`; `processedStripeEvents` row written; `users.planStatus` updated.
- POST with valid signature and replayed `event.id` → `200`; no second write (idempotent).
- `customer.subscription.deleted` → `planStatus: "canceled"`, `plan: null`.

### `apps/convex/convex/_lib/withUser.test.ts` (uses `convex-test`)

- `requireUser` without identity → throws `UNAUTHENTICATED`.
- `requireUser` with identity → returns `userId`.
- `users.me` as anon → throws; as authed → returns user doc.

### `apps/web/middleware.test.ts` (Bun test + mock `NextRequest`)

- Response sets `Content-Security-Policy`; nonce appears in both `script-src` and `style-src`.
- Production CSP contains HSTS-relevant directives and omits `'unsafe-eval'`.
- Development CSP contains `'unsafe-eval'` and `ws://localhost:*`.
- Matcher excludes `/_next/static/...`.

### Out of scope for this pass

Elysia integration tests for rate-limit + bearer (would require booting a real listener). Type composition + middleware unit coverage is sufficient for the template pass.

## Migration / order of operations

This is a greenfield template, so there is no data to migrate. Implementation order matters for cross-section dependencies:

1. Section 1 (`packages/config`) lands first — every other section imports `env`.
2. Section 3 (Convex Auth) lands before Section 2 (Stripe webhook) because the webhook touches the `users` schema and tests sit alongside auth tests; doing auth first avoids re-touching `schema.ts`.
3. Section 4 (Next.js headers) and Section 5 (Elysia) are independent and can land in either order.
4. Section 6 (`.env.example`) lands last so it reflects the final shape.
5. Section 7 (tests) is interleaved — each suite lands with its corresponding section.

## Version pinning

The spec lists deps without exact versions because the repo's `check-versions.ts` enforces pins centrally. The implementing pass picks the current latest stable for each new dep at the moment of writing, adds it to the relevant `package.json` with an exact pin (no `^` or `~`), and extends `tooling/scripts/check-versions.ts`'s allow-list to cover it. The spec calls out which deps are new; the version numbers are chosen at implementation time and reviewed alongside the code.

## Risks

- **Convex Auth `Password` provider UX:** users will need a sign-up flow on the web side to exercise auth. This template has no such page yet (Sub-project 4 adds it). Foundation ships the backend; forks can curl `/api/auth/*` to test until Sub-project 4 lands.
- **CSP and the existing landing page:** the landing uses `globals.css` and a few inline `style={{...}}` props for animations. Inline styles will need nonces or hash allowances. Inventory inline-style sites during implementation; if more than a couple, switch them to Tailwind utilities before turning CSP on in prod.
- **Stripe SDK version pinning:** the `apiVersion` constant in `_lib/stripe.ts` must match the pinned `stripe` package's default to avoid surprise behavior changes when bumping. Add a comment to that line.
- **In-memory rate limit + multi-worker Bun:** Bun's `--smol` and clustered deployments will not share state. This is acknowledged via the `X-RateLimit-Backend: memory` header and README note; not fixed here.

## Acceptance criteria

- `bun run typecheck` passes.
- `bun run test` runs and the four new test suites pass.
- `bunx convex deploy --dry-run` succeeds against the new schema.
- `bun run check:versions` passes with the new pins.
- Manual: POSTing to the Stripe webhook without a signature returns `400`. POSTing with a valid CLI-generated signature returns `200`.
- Manual: hitting `apps/web` in dev shows a `Content-Security-Policy` response header with a fresh nonce per refresh.
- Manual: hitting `apps/api`'s `/protected/me` without a bearer returns `401`; with the right token returns `200`; >60 req/min returns `429`.
