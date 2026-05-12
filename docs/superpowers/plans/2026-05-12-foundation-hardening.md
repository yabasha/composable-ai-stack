# Foundation Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** make the template's defaults safe to fork — add env validation, Stripe webhook signature verification, Convex Auth, CSP/security headers, and a hardened Elysia skeleton, all backed by tests.

**Architecture:** one Zod env schema in `packages/config` parsed twice (Node loader for Next/Elysia/Worker, Convex-side loader inside `apps/convex`). Stripe webhook verifies the raw body, records the event ID for idempotency, applies subscription state to the `users` table. Convex Auth's `Password` provider wires `@convex-dev/auth` and re-exports a `requireUser` guard. Next.js gets a CSP-nonce middleware plus static headers in `next.config.ts`. Elysia composes CORS + security-headers + bearer guard + in-memory rate limit on `/protected/*` with structured pino logging and graceful shutdown.

**Tech Stack:** Bun 1.3.7 (test runner), Turborepo 2.7.6, Convex 1.31.6, `@convex-dev/auth`, Stripe SDK, Next.js 16.1.6 (Edge middleware), Elysia 1.4.22, Zod 3.x, pino. Workspace scope is `@acme/*` (rename to `@cas/*` is Sub-project 6, out of scope here).

**Reference spec:** `docs/superpowers/specs/2026-05-12-foundation-hardening-design.md`.

---

## Pre-flight conventions

- **Package versions:** when a new dep is added, install with `bun add <name>@<latest-stable>` (exact pin, no `^`). After each install, add the name to the right block in `tooling/scripts/check-versions.ts` with the version you just installed. `bun run check:versions` must pass after every commit.
- **Bun test:** all tests use `import { test, expect, describe } from "bun:test"` and run via `bun test` from the workspace root or the package dir.
- **Commits:** small, focused, one per task. Use Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`). No mention of Claude/AI.
- **Worktree:** this plan executes inside an existing worktree (`worktree-foundation-hardening-spec`). Do not switch branches.

---

## Task 1: Add zod + dotenv to `packages/config`

**Files:**
- Modify: `packages/config/package.json`
- Modify: `tooling/scripts/check-versions.ts`

- [ ] **Step 1: Install zod and dotenv into the config package**

Run:
```bash
bun add --filter=@acme/config zod@3.23.8 dotenv@16.4.7
```

Expected: both deps appear under `packages/config/package.json` `dependencies` with exact pins.

- [ ] **Step 2: Verify pins are exact**

Run: `grep -E '"(zod|dotenv)"' packages/config/package.json`
Expected output contains `"zod": "3.23.8"` and `"dotenv": "16.4.7"` (no `^`/`~`).

- [ ] **Step 3: Extend `tooling/scripts/check-versions.ts` to enforce the new pins**

Open `tooling/scripts/check-versions.ts`. Locate the `PINS` constant. Add a `config` section (the existing `PINS.root` and `PINS.web` show the shape):

```ts
// Inside the PINS object, alongside `root` and `web`:
  config: {
    dependencies: {
      zod: "3.23.8",
      dotenv: "16.4.7"
    }
  },
```

Then find the section at the bottom of the file that calls `assertEq` per workspace. Add:

```ts
// --- @acme/config ---
const cfgPkg = readJSON(join(process.cwd(), "packages/config/package.json"));
assertEq("config.zod", getDep(cfgPkg, "zod"), PINS.config.dependencies.zod);
assertEq("config.dotenv", getDep(cfgPkg, "dotenv"), PINS.config.dependencies.dotenv);
```

(Pattern-match the file's existing style — copy the closest existing block and adapt.)

- [ ] **Step 4: Verify the version check passes**

Run: `bun tooling/scripts/check-versions.ts`
Expected: exits 0 with no error output.

- [ ] **Step 5: Commit**

```bash
git add packages/config/package.json package.json bun.lock tooling/scripts/check-versions.ts
git commit -m "chore(config): pin zod and dotenv in @acme/config"
```

---

## Task 2: Write the env schema test (failing)

**Files:**
- Create: `packages/config/src/schema.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/config/src/schema.test.ts`:

```ts
import { test, expect, describe } from "bun:test";
import { parseEnv } from "./schema";

const validProd = {
  NODE_ENV: "production",
  STRIPE_SECRET_KEY: "sk_test_x",
  STRIPE_WEBHOOK_SECRET: "whsec_x",
  CONVEX_DEPLOYMENT: "dev:abc",
  NEXT_PUBLIC_CONVEX_URL: "https://example.convex.cloud",
  NEXT_PUBLIC_APP_URL: "https://app.example.com",
  API_BEARER_TOKEN: "a".repeat(32)
};

describe("parseEnv", () => {
  test("parses a valid dev env and applies defaults", () => {
    const env = parseEnv({ NODE_ENV: "development" }, "development");
    expect(env.NODE_ENV).toBe("development");
    expect(env.WEBHOOK_TOLERANCE_SECONDS).toBe(300);
    expect(env.API_PORT).toBe(3001);
    expect(env.LOG_LEVEL).toBe("info");
  });

  test("parses a valid production env with all required fields", () => {
    const env = parseEnv(validProd, "production");
    expect(env.STRIPE_SECRET_KEY).toBe("sk_test_x");
    expect(env.API_BEARER_TOKEN.length).toBe(32);
  });

  test("rejects production env missing STRIPE_SECRET_KEY", () => {
    const { STRIPE_SECRET_KEY: _, ...partial } = validProd;
    expect(() => parseEnv(partial, "production")).toThrow(/STRIPE_SECRET_KEY/);
  });

  test("rejects production env with too-short API_BEARER_TOKEN", () => {
    expect(() =>
      parseEnv({ ...validProd, API_BEARER_TOKEN: "short" }, "production")
    ).toThrow(/API_BEARER_TOKEN/);
  });

  test("rejects invalid NODE_ENV value", () => {
    expect(() => parseEnv({ NODE_ENV: "staging" }, "staging")).toThrow(/NODE_ENV/);
  });

  test("coerces numeric string envs", () => {
    const env = parseEnv(
      { NODE_ENV: "development", API_PORT: "4000", WEBHOOK_TOLERANCE_SECONDS: "60" },
      "development"
    );
    expect(env.API_PORT).toBe(4000);
    expect(env.WEBHOOK_TOLERANCE_SECONDS).toBe(60);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/config && bun test`
Expected: FAIL — `Cannot find module './schema'` (or similar). The test file references a `schema.ts` we have not written yet.

---

## Task 3: Implement `packages/config/src/schema.ts`

**Files:**
- Create: `packages/config/src/schema.ts`

- [ ] **Step 1: Write the schema module**

Create `packages/config/src/schema.ts`:

```ts
import { z } from "zod";

export type Mode = "development" | "test" | "production";

const optionalUrl = z.string().url().optional();
const optionalStr = z.string().optional();

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    STRIPE_SECRET_KEY: optionalStr,
    STRIPE_WEBHOOK_SECRET: optionalStr,
    CONVEX_DEPLOYMENT: optionalStr,
    NEXT_PUBLIC_CONVEX_URL: optionalUrl,
    NEXT_PUBLIC_APP_URL: optionalUrl,
    API_BEARER_TOKEN: z.string().min(32).optional(),

    WEBHOOK_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(300),
    API_PORT: z.coerce.number().int().positive().default(3001),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    const requiredInProd: Array<keyof typeof env> = [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "CONVEX_DEPLOYMENT",
      "NEXT_PUBLIC_CONVEX_URL",
      "NEXT_PUBLIC_APP_URL",
      "API_BEARER_TOKEN"
    ];
    for (const key of requiredInProd) {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when NODE_ENV=production`
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(input: Record<string, unknown>, mode: string): Env {
  const candidate = { ...input, NODE_ENV: mode ?? input.NODE_ENV };
  const result = envSchema.safeParse(candidate);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${detail}`);
  }
  return result.data;
}
```

- [ ] **Step 2: Run the schema tests to verify they pass**

Run: `cd packages/config && bun test`
Expected: all 6 tests PASS.

- [ ] **Step 3: Typecheck**

Run: `cd packages/config && bun run typecheck`
Expected: exits 0.

- [ ] **Step 4: Add a `test` script to `packages/config/package.json` so `turbo test` picks it up**

In `packages/config/package.json`, change the `scripts` block to include:

```json
"scripts": {
  "typecheck": "tsc -p tsconfig.json --noEmit",
  "test": "bun test"
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/config/src/schema.ts packages/config/src/schema.test.ts packages/config/package.json
git commit -m "feat(config): add Zod env schema with NODE_ENV-conditional required fields"
```

---

## Task 4: Implement `packages/config/src/node.ts` (Node-runtime loader)

**Files:**
- Create: `packages/config/src/node.ts`
- Modify: `packages/config/src/index.ts`

- [ ] **Step 1: Write the Node loader**

Create `packages/config/src/node.ts`:

```ts
import { parseEnv, type Env } from "./schema";

if (process.env.NODE_ENV !== "production") {
  // Best-effort .env loading in non-prod; ignore if dotenv is absent.
  try {
    const dotenv = await import("dotenv");
    dotenv.config();
  } catch {
    // dotenv is an optional runtime convenience; production deploys inject env directly.
  }
}

const mode = process.env.NODE_ENV ?? "development";
export const env: Env = Object.freeze(parseEnv(process.env, mode));
```

- [ ] **Step 2: Replace the placeholder entrypoint**

Open `packages/config/src/index.ts`. Replace the entire contents with:

```ts
export { env } from "./node";
export type { Env, Mode } from "./schema";
export { envSchema, parseEnv } from "./schema";
```

- [ ] **Step 3: Add an `exports` map to `packages/config/package.json`**

So that `import from "@acme/config"` and `import from "@acme/config/schema"` resolve via Node-style module resolution (Convex's deploy-time bundler needs this; tsconfig path aliases alone are not enough for the Convex runtime).

Add to `packages/config/package.json`:

```json
"exports": {
  ".": "./src/index.ts",
  "./schema": "./src/schema.ts"
}
```

- [ ] **Step 4: Typecheck**

Run: `cd packages/config && bun run typecheck`
Expected: exits 0.

- [ ] **Step 5: Manual smoke check the loader**

Run from the repo root:
```bash
NODE_ENV=development bun -e 'import("@acme/config").then(m => console.log(m.env.API_PORT))'
```
Expected: prints `3001`.

- [ ] **Step 6: Commit**

```bash
git add packages/config/src/node.ts packages/config/src/index.ts packages/config/package.json
git commit -m "feat(config): add Node loader and exports map"
```

---

## Task 5: Wire `@acme/config` into workspace path aliases

**Files:**
- Modify: `apps/web/tsconfig.json`
- Modify: `apps/api/tsconfig.json`
- Modify: `apps/worker/tsconfig.json`
- Modify: `apps/convex/tsconfig.json`

- [ ] **Step 1: Add `@acme/config` and `@acme/config/schema` to `apps/web/tsconfig.json`**

Open `apps/web/tsconfig.json`. The `paths` block currently has entries for `@acme/shared`, `@acme/schemas`, `@acme/prompts`, `@acme/ai`. Add at the end of `paths`:

```json
      "@acme/config": [
        "../../packages/config/src/index.ts"
      ],
      "@acme/config/schema": [
        "../../packages/config/src/schema.ts"
      ]
```

(Mind the trailing comma on the previous entry.)

- [ ] **Step 2: Add the same two entries to `apps/api/tsconfig.json`**

Open `apps/api/tsconfig.json`. If it has no `paths` block, add one inside `compilerOptions`:

```json
"paths": {
  "@acme/config": ["../../packages/config/src/index.ts"],
  "@acme/config/schema": ["../../packages/config/src/schema.ts"]
}
```

If it already has a `paths` block, just add the two entries.

- [ ] **Step 3: Repeat for `apps/worker/tsconfig.json` and `apps/convex/tsconfig.json`**

Same `paths` additions. The Convex tsconfig only resolves at typecheck time — Convex's bundler resolves `@acme/config/schema` via `node_modules`-style workspace links at deploy time, so step 4 below adds the workspace dep declarations.

- [ ] **Step 4: Add `@acme/config` as a workspace dependency in every consuming app**

For each of `apps/web/package.json`, `apps/api/package.json`, `apps/worker/package.json`, `apps/convex/package.json`, add to `dependencies`:

```json
"@acme/config": "workspace:*"
```

Then run from the repo root: `bun install`
Expected: lockfile updates, no errors.

- [ ] **Step 5: Verify typecheck across the repo**

Run: `bun run typecheck`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/*/tsconfig.json apps/*/package.json bun.lock
git commit -m "chore: wire @acme/config into all app workspaces"
```

---

## Task 6: Install Convex Auth + create Convex-side env loader

**Files:**
- Modify: `apps/convex/package.json`
- Create: `apps/convex/convex/_lib/env.ts`
- Modify: `tooling/scripts/check-versions.ts`

- [ ] **Step 1: Install `@convex-dev/auth`**

Run from the repo root:
```bash
bun add --filter=convex @convex-dev/auth@latest @auth/core@latest
```

(`@auth/core` is `@convex-dev/auth`'s peer dependency.)

After install, note the resolved versions (look in `apps/convex/package.json`).

- [ ] **Step 2: Convert the resolved versions to exact pins**

Open `apps/convex/package.json`. If either dep has a `^` or `~`, replace with the exact resolved version (find it in `bun.lock` or `node_modules/<dep>/package.json`).

- [ ] **Step 3: Add the two pins to `tooling/scripts/check-versions.ts`**

In `PINS`, add a `convex` section (or extend an existing one):

```ts
  convex: {
    dependencies: {
      convex: "1.31.6",
      "@convex-dev/auth": "<the version you just installed>",
      "@auth/core": "<the version you just installed>"
    }
  },
```

And at the bottom of the file, add the corresponding `assertEq` calls for the convex workspace, mirroring the pattern used for `web`.

- [ ] **Step 4: Verify pins**

Run: `bun run check:versions`
Expected: exits 0.

- [ ] **Step 5: Create the Convex-side env loader**

Create `apps/convex/convex/_lib/env.ts`:

```ts
import { parseEnv, type Env } from "@acme/config/schema";

const mode = process.env.NODE_ENV ?? "development";
export const env: Env = Object.freeze(parseEnv(process.env, mode));
```

- [ ] **Step 6: Typecheck convex**

Run: `cd apps/convex && bun run typecheck`
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add apps/convex/package.json apps/convex/convex/_lib/env.ts tooling/scripts/check-versions.ts bun.lock
git commit -m "feat(convex): install Convex Auth and add Convex-side env loader"
```

---

## Task 7: Extend the Convex schema (users + auth tables + processedStripeEvents)

**Files:**
- Modify: `apps/convex/convex/schema.ts`

- [ ] **Step 1: Replace `apps/convex/convex/schema.ts` with the expanded schema**

Open `apps/convex/convex/schema.ts`. Replace contents with:

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    email: v.string(),
    tokenIdentifier: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),

    stripeCustomerId: v.optional(v.string()),
    plan: v.optional(v.string()),
    planStatus: v.optional(v.string()),
    planUpdatedAt: v.optional(v.number()),

    createdAt: v.number()
  })
    .index("by_email", ["email"])
    .index("by_token", ["tokenIdentifier"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

  processedStripeEvents: defineTable({
    eventId: v.string(),
    type: v.string(),
    processedAt: v.number()
  }).index("by_eventId", ["eventId"])
});
```

- [ ] **Step 2: Typecheck convex**

Run: `cd apps/convex && bun run typecheck`
Expected: exits 0.

- [ ] **Step 3: Dry-run a Convex deploy to confirm schema validity**

Run: `cd apps/convex && bunx convex deploy --dry-run` (requires `CONVEX_DEPLOYMENT` set; if unset locally, skip this step and rely on typecheck).
Expected: no schema errors.

- [ ] **Step 4: Commit**

```bash
git add apps/convex/convex/schema.ts
git commit -m "feat(convex): expand users schema and add processedStripeEvents + auth tables"
```

---

## Task 8: Wire Convex Auth (`auth.ts`, `auth.config.ts`)

**Files:**
- Create: `apps/convex/convex/auth.ts`
- Create: `apps/convex/convex/auth.config.ts`

- [ ] **Step 1: Create `apps/convex/convex/auth.config.ts`**

```ts
// SITE_URL is set via `bunx convex env set SITE_URL <url>` and lives in the
// Convex dashboard, not in @acme/config (which never reaches Convex's runtime
// for SITE_URL specifically — it's read here only).
export default {
  providers: [
    {
      domain: process.env.SITE_URL!,
      applicationID: "convex"
    }
  ]
};
```

- [ ] **Step 2: Create `apps/convex/convex/auth.ts`**

```ts
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

/**
 * Convex Auth wiring. The Password provider is the only built-in for the
 * template; add GitHub/Google/etc. by following:
 *   https://labs.convex.dev/auth/config/oauth
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password]
});
```

- [ ] **Step 3: Typecheck convex**

Run: `cd apps/convex && bun run typecheck`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/convex/convex/auth.ts apps/convex/convex/auth.config.ts
git commit -m "feat(convex): wire @convex-dev/auth with Password provider"
```

---

## Task 9: Write the `requireUser` test (failing)

**Files:**
- Create: `apps/convex/convex/_lib/withUser.test.ts`

- [ ] **Step 1: Install `convex-test` as a dev dependency**

Run: `bun add --filter=convex -d convex-test@latest`

After install, replace the resolved version with an exact pin in `apps/convex/package.json` (no `^`). Add the pin to `tooling/scripts/check-versions.ts` under the convex devDependencies.

Run: `bun run check:versions` to confirm.

- [ ] **Step 2: Write the failing test**

Create `apps/convex/convex/_lib/withUser.test.ts`:

```ts
import { test, expect, describe } from "bun:test";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

describe("requireUser", () => {
  test("users.me throws when unauthenticated", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.users.me, {})).rejects.toThrow(/UNAUTHENTICATED/);
  });

  test("users.me returns the user doc when authenticated", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => {
      return ctx.db.insert("users", {
        email: "alice@example.com",
        tokenIdentifier: "convex:alice",
        createdAt: Date.now()
      });
    });
    const asAlice = t.withIdentity({ tokenIdentifier: "convex:alice", subject: userId });
    const me = await asAlice.query(api.users.me, {});
    expect(me?.email).toBe("alice@example.com");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd apps/convex && bun test`
Expected: FAIL — `api.users` is undefined (we have not created `users.ts` yet) and `requireUser` does not exist.

---

## Task 10: Implement `requireUser` + `users.me` / `updateProfile`

**Files:**
- Create: `apps/convex/convex/_lib/withUser.ts`
- Create: `apps/convex/convex/users.ts`

- [ ] **Step 1: Create the guard helper**

Create `apps/convex/convex/_lib/withUser.ts`:

```ts
import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

type Ctx = QueryCtx | MutationCtx;

export async function requireUser(ctx: Ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError({ code: "UNAUTHENTICATED" });
  return userId;
}

export async function requireUserDoc(ctx: Ctx) {
  const userId = await requireUser(ctx);
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });
  return user;
}
```

- [ ] **Step 2: Create the example user queries**

Create `apps/convex/convex/users.ts`:

```ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireUserDoc } from "./_lib/withUser";

export const me = query({
  args: {},
  handler: async (ctx) => requireUserDoc(ctx)
});

export const updateProfile = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await requireUser(ctx);
    await ctx.db.patch(userId, { name });
  }
});
```

- [ ] **Step 3: Regenerate Convex types**

Run: `cd apps/convex && bunx convex codegen`
Expected: `_generated/api.d.ts` updates to include `users.me` and `users.updateProfile`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/convex && bun test convex/_lib/withUser.test.ts`
Expected: both tests PASS.

- [ ] **Step 5: Add `test` script to `apps/convex/package.json`**

Add to `scripts`:

```json
"test": "bun test"
```

- [ ] **Step 6: Commit**

```bash
git add apps/convex/convex/_lib/withUser.ts apps/convex/convex/_lib/withUser.test.ts apps/convex/convex/users.ts apps/convex/convex/_generated apps/convex/package.json
git commit -m "feat(convex): add requireUser guard and example users queries"
```

---

## Task 11: Install Stripe SDK and create `_lib/stripe.ts`

**Files:**
- Modify: `apps/convex/package.json`
- Create: `apps/convex/convex/_lib/stripe.ts`

- [ ] **Step 1: Install Stripe SDK**

Run: `bun add --filter=convex stripe@latest`

Pin the exact version in `apps/convex/package.json` (no `^`). Add it to `tooling/scripts/check-versions.ts` under the convex deps.

Run: `bun run check:versions` to confirm.

- [ ] **Step 2: Create the lazy Stripe client**

Create `apps/convex/convex/_lib/stripe.ts`:

```ts
import Stripe from "stripe";
import { env } from "./env";

// Pin apiVersion to the SDK's current default for the pinned stripe package.
// When bumping the stripe dep, review the changelog and update this string.
const API_VERSION = "2025-01-27.acacia" as const;

let cached: Stripe | undefined;

export function getStripe(): Stripe {
  if (!cached) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is required to use the Stripe client");
    }
    cached = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: API_VERSION });
  }
  return cached;
}
```

> **Note for the implementer:** the `API_VERSION` string above is a placeholder for the version that ships with the resolved Stripe SDK. After installing, run `bun -e 'import("stripe").then(m => console.log(new m.default("sk_test_x").getApiField("version")))'` (or check `node_modules/stripe/types/lib.d.ts`) and replace `API_VERSION` with the actual default.

- [ ] **Step 3: Typecheck**

Run: `cd apps/convex && bun run typecheck`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/convex/package.json apps/convex/convex/_lib/stripe.ts tooling/scripts/check-versions.ts bun.lock
git commit -m "feat(convex): add Stripe SDK and lazy client"
```

---

## Task 12: Write the Stripe webhook test (failing)

**Files:**
- Create: `apps/convex/convex/http.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/convex/convex/http.test.ts`:

```ts
import { test, expect, describe } from "bun:test";
import { convexTest } from "convex-test";
import Stripe from "stripe";
import schema from "./schema";

const SECRET = "whsec_test_secret_value";

function signedRequest(body: string, secret: string): Request {
  const stripe = new Stripe("sk_test_x", { apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion });
  const header = stripe.webhooks.generateTestHeaderString({ payload: body, secret });
  return new Request("https://convex.example/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": header, "content-type": "application/json" },
    body
  });
}

function unsignedRequest(body: string): Request {
  return new Request("https://convex.example/stripe/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body
  });
}

const baseEvent = (overrides: Partial<Record<string, unknown>> = {}) =>
  JSON.stringify({
    id: "evt_test_1",
    type: "customer.subscription.updated",
    data: {
      object: {
        customer: "cus_test_1",
        status: "active",
        items: { data: [{ price: { id: "price_x", lookup_key: "pro_monthly" } }] }
      }
    },
    ...overrides
  });

describe("POST /stripe/webhook", () => {
  test("returns 400 when Stripe-Signature is missing", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    const t = convexTest(schema);
    const res = await t.fetch(unsignedRequest(baseEvent()));
    expect(res.status).toBe(400);
  });

  test("returns 400 when the signature is invalid", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    const t = convexTest(schema);
    const body = baseEvent();
    const req = signedRequest(body, "whsec_wrong_secret");
    const res = await t.fetch(req);
    expect(res.status).toBe(400);
  });

  test("returns 200 on valid signature and updates the user plan", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: "alice@example.com",
        stripeCustomerId: "cus_test_1",
        createdAt: Date.now()
      });
    });
    const res = await t.fetch(signedRequest(baseEvent(), SECRET));
    expect(res.status).toBe(200);
    const user = await t.run((ctx) =>
      ctx.db.query("users").withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", "cus_test_1")).first()
    );
    expect(user?.planStatus).toBe("active");
    expect(user?.plan).toBe("pro_monthly");
  });

  test("replay of the same event id is idempotent", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    const t = convexTest(schema);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "alice@example.com",
        stripeCustomerId: "cus_test_1",
        createdAt: Date.now()
      })
    );
    const body = baseEvent();
    await t.fetch(signedRequest(body, SECRET));
    const res2 = await t.fetch(signedRequest(body, SECRET));
    expect(res2.status).toBe(200);
    const events = await t.run((ctx) => ctx.db.query("processedStripeEvents").collect());
    expect(events.length).toBe(1);
  });

  test("customer.subscription.deleted sets planStatus to canceled", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    const t = convexTest(schema);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "alice@example.com",
        stripeCustomerId: "cus_test_1",
        createdAt: Date.now()
      })
    );
    const body = baseEvent({ id: "evt_test_2", type: "customer.subscription.deleted" });
    const res = await t.fetch(signedRequest(body, SECRET));
    expect(res.status).toBe(200);
    const user = await t.run((ctx) =>
      ctx.db.query("users").withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", "cus_test_1")).first()
    );
    expect(user?.planStatus).toBe("canceled");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/convex && bun test convex/http.test.ts`
Expected: FAIL — current `http.ts` returns 200 unconditionally; signature checks are not implemented; `internal.stripe` does not exist.

---

## Task 13: Implement the Stripe internal mutations

**Files:**
- Create: `apps/convex/convex/stripe.ts`

- [ ] **Step 1: Create the internal mutations**

Create `apps/convex/convex/stripe.ts`:

```ts
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Records a Stripe event ID. Returns true if newly recorded, false if duplicate
 * (the caller should treat false as "already processed; skip work").
 *
 * Convex has no unique-index constraint. This is a read-then-insert; concurrent
 * deliveries of the same event could race. Stripe retries are sequential in
 * practice, so this is acceptable for a template. Forks needing strict
 * uniqueness should layer their own pattern.
 */
export const recordEvent = internalMutation({
  args: { eventId: v.string(), type: v.string() },
  handler: async (ctx, { eventId, type }) => {
    const existing = await ctx.db
      .query("processedStripeEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .first();
    if (existing) return false;
    await ctx.db.insert("processedStripeEvents", {
      eventId,
      type,
      processedAt: Date.now()
    });
    return true;
  }
});

export const applySubscriptionChange = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    status: v.string(),
    plan: v.union(v.string(), v.null())
  },
  handler: async (ctx, { stripeCustomerId, status, plan }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", stripeCustomerId))
      .first();
    if (!user) return;
    await ctx.db.patch(user._id, {
      planStatus: status,
      plan: plan ?? undefined,
      planUpdatedAt: Date.now()
    });
  }
});
```

- [ ] **Step 2: Regenerate convex types**

Run: `cd apps/convex && bunx convex codegen`

- [ ] **Step 3: Commit**

```bash
git add apps/convex/convex/stripe.ts apps/convex/convex/_generated
git commit -m "feat(convex): add internal mutations for Stripe event idempotency and subscription sync"
```

---

## Task 14: Implement the Stripe webhook handler

**Files:**
- Modify: `apps/convex/convex/http.ts`

- [ ] **Step 1: Replace `apps/convex/convex/http.ts` contents**

```ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { getStripe } from "./_lib/stripe";
import { env } from "./_lib/env";
import type Stripe from "stripe";

const http = httpRouter();

// Mount Convex Auth routes (`/api/auth/*`).
auth.addHttpRoutes(http);

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      return new Response("STRIPE_WEBHOOK_SECRET not configured", { status: 500 });
    }

    const body = await request.text();
    const sig = request.headers.get("stripe-signature");
    if (!sig) return new Response("missing signature", { status: 400 });

    const stripe = getStripe();
    let event: Stripe.Event;
    try {
      // Convex's runtime is Web-Crypto only — `constructEvent` fails with
      // "SubtleCryptoProvider cannot be used in a synchronous context."
      event = await stripe.webhooks.constructEventAsync(
        body,
        sig,
        env.STRIPE_WEBHOOK_SECRET,
        env.WEBHOOK_TOLERANCE_SECONDS
      );
    } catch {
      return new Response("invalid signature", { status: 400 });
    }

    const fresh = await ctx.runMutation(internal.stripe.recordEvent, {
      eventId: event.id,
      type: event.type
    });
    if (!fresh) return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const item = sub.items.data[0]?.price;
        await ctx.runMutation(internal.stripe.applySubscriptionChange, {
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          status: sub.status,
          plan: item?.lookup_key ?? item?.id ?? null
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await ctx.runMutation(internal.stripe.applySubscriptionChange, {
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          status: "canceled",
          plan: null
        });
        break;
      }
      default:
        console.info("unhandled stripe event type", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  })
});

export default http;
```

- [ ] **Step 2: Run the webhook tests to verify they pass**

Run: `cd apps/convex && bun test convex/http.test.ts`
Expected: all 5 tests PASS.

- [ ] **Step 3: Run the full convex test suite**

Run: `cd apps/convex && bun test`
Expected: all tests PASS (webhook + withUser).

- [ ] **Step 4: Commit**

```bash
git add apps/convex/convex/http.ts
git commit -m "feat(convex): verify Stripe webhook signatures and sync subscription state"
```

---

## Task 15: Write the Next.js middleware CSP test (failing)

**Files:**
- Create: `apps/web/middleware.test.ts`

- [ ] **Step 1: Add `bun test` script to `apps/web/package.json`**

Add to `scripts`:

```json
"test": "bun test"
```

- [ ] **Step 2: Write the failing test**

Create `apps/web/middleware.test.ts`:

```ts
import { test, expect, describe, beforeEach } from "bun:test";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

function makeReq(path = "/"): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

describe("middleware CSP", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
  });

  test("sets a nonce on the request and CSP on the response", async () => {
    const res = await middleware(makeReq("/"));
    const csp = res.headers.get("content-security-policy");
    expect(csp).toBeTruthy();
    const nonceMatch = csp!.match(/'nonce-([A-Za-z0-9+/=]+)'/);
    expect(nonceMatch).not.toBeNull();
    const nonce = nonceMatch![1];
    expect(csp).toContain(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
    expect(csp).toContain(`style-src 'self' 'nonce-${nonce}'`);
  });

  test("development CSP includes 'unsafe-eval' and ws://localhost", async () => {
    process.env.NODE_ENV = "development";
    const res = await middleware(makeReq("/"));
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws://localhost:*");
  });

  test("production CSP omits 'unsafe-eval'", async () => {
    process.env.NODE_ENV = "production";
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
    process.env.CONVEX_DEPLOYMENT = "prod:abc";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    process.env.API_BEARER_TOKEN = "a".repeat(32);
    const res = await middleware(makeReq("/"));
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).not.toContain("'unsafe-eval'");
  });

  test("CSP includes the Convex URL in connect-src", async () => {
    const res = await middleware(makeReq("/"));
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).toContain("https://example.convex.cloud");
    expect(csp).toContain("wss://example.convex.cloud");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd apps/web && bun test middleware.test.ts`
Expected: FAIL — `./middleware` does not exist.

---

## Task 16: Implement `apps/web/middleware.ts`

**Files:**
- Create: `apps/web/middleware.ts`

- [ ] **Step 1: Write the middleware**

Create `apps/web/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { envSchema } from "@acme/config/schema";

function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // base64 without padding
  return btoa(String.fromCharCode(...bytes)).replace(/=+$/, "");
}

function convexWss(url: string | undefined): string {
  if (!url) return "";
  return url.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
}

export function middleware(req: NextRequest) {
  // Parse env per-request — Edge runtime is fast, this keeps test mocking simple.
  // Production schema enforcement happens at app boot via @acme/config (Node).
  const env = envSchema.parse({ ...process.env });
  const nonce = makeNonce();
  const isProd = env.NODE_ENV === "production";
  const convexHttp = env.NEXT_PUBLIC_CONVEX_URL ?? "";
  const convexWs = convexWss(convexHttp);

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    !isProd && "'unsafe-eval'"
  ]
    .filter(Boolean)
    .join(" ");

  const connectSrc = ["'self'", convexHttp, convexWs, !isProd && "ws://localhost:*", !isProd && "http://localhost:*"]
    .filter(Boolean)
    .join(" ");

  // TODO(fork): add Stripe (https://js.stripe.com, https://api.stripe.com)
  // and analytics origins to script-src / connect-src as needed.
  const csp = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' blob: data:`,
    `font-src 'self' data:`,
    `connect-src ${connectSrc}`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("content-security-policy", csp);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]
};
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `cd apps/web && bun test middleware.test.ts`
Expected: all 4 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/middleware.ts apps/web/middleware.test.ts apps/web/package.json
git commit -m "feat(web): add CSP middleware with per-request nonces"
```

---

## Task 17: Add `next.config.ts` static headers

**Files:**
- Create: `apps/web/next.config.ts`
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Create `apps/web/next.config.ts`**

```ts
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload"
        }
      ]
    : [])
];

const config: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  }
};

export default config;
```

- [ ] **Step 2: Wire nonce consumption into `apps/web/app/layout.tsx`**

Replace the file contents with:

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Composable AI Stack",
  description: "A production-ready monorepo for building AI-powered applications"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Nonce wired via middleware.ts; forks rendering <Script> tags pass this prop.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  void nonce;
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Typecheck web**

Run: `cd apps/web && bun run typecheck`
Expected: exits 0.

- [ ] **Step 4: Manual smoke test the headers (optional, requires dev server)**

Run from another shell: `cd apps/web && bun run dev`
Then: `curl -sI http://localhost:3000 | grep -iE 'content-security-policy|x-frame|referrer|permissions'`
Expected: CSP header with a nonce, plus the static headers above.
Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/next.config.ts apps/web/app/layout.tsx
git commit -m "feat(web): add next.config.ts security headers and nonce consumption in layout"
```

---

## Task 18: Install Elysia plugins + pino

**Files:**
- Modify: `apps/api/package.json`
- Modify: `tooling/scripts/check-versions.ts`

- [ ] **Step 1: Install runtime deps**

Run: `bun add --filter=api @elysiajs/cors@latest @elysiajs/bearer@latest pino@latest`

- [ ] **Step 2: Install dev dep**

Run: `bun add --filter=api -d pino-pretty@latest`

- [ ] **Step 3: Pin exact versions in `apps/api/package.json`**

Replace any `^` or `~` ranges with the exact resolved versions.

- [ ] **Step 4: Add pins to `tooling/scripts/check-versions.ts`**

Extend the `PINS` constant with an `api` block:

```ts
  api: {
    dependencies: {
      elysia: "1.4.22",
      "@elysiajs/cors": "<resolved>",
      "@elysiajs/bearer": "<resolved>",
      pino: "<resolved>"
    },
    devDependencies: {
      "pino-pretty": "<resolved>"
    }
  },
```

Add the corresponding `assertEq` calls at the bottom of the file.

- [ ] **Step 5: Verify pins**

Run: `bun run check:versions`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/api/package.json tooling/scripts/check-versions.ts bun.lock
git commit -m "chore(api): install and pin Elysia plugins and pino"
```

---

## Task 19: Add Elysia logger + security headers + bearer guard + rate limit

**Files:**
- Create: `apps/api/src/env.ts`
- Create: `apps/api/src/logger.ts`
- Create: `apps/api/src/middleware/security-headers.ts`
- Create: `apps/api/src/middleware/rate-limit.ts`
- Create: `apps/api/src/middleware/bearer-guard.ts`

- [ ] **Step 1: Create `apps/api/src/env.ts`**

```ts
export { env } from "@acme/config";
```

- [ ] **Step 2: Create `apps/api/src/logger.ts`**

```ts
import pino from "pino";
import { env } from "./env";

const isProd = env.NODE_ENV === "production";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.token"
    ],
    censor: "[redacted]"
  },
  transport: isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss.l" } }
});
```

- [ ] **Step 3: Create `apps/api/src/middleware/security-headers.ts`**

```ts
import { Elysia } from "elysia";
import { env } from "../env";

const isProd = env.NODE_ENV === "production";

export const securityHeaders = new Elysia({ name: "security-headers" }).onAfterHandle(
  ({ set }) => {
    const headers = (set.headers ??= {});
    headers["x-content-type-options"] = "nosniff";
    headers["x-frame-options"] = "DENY";
    headers["referrer-policy"] = "strict-origin-when-cross-origin";
    headers["permissions-policy"] = "camera=(), microphone=(), geolocation=(), interest-cohort=()";
    if (isProd) {
      headers["strict-transport-security"] = "max-age=63072000; includeSubDomains; preload";
    }
  }
);
```

- [ ] **Step 4: Create `apps/api/src/middleware/rate-limit.ts`**

```ts
// In-memory rate limiter. Replace with Redis/Upstash for multi-worker deployments.
// See README → "Scaling the rate limiter".
import { Elysia } from "elysia";

type Bucket = { count: number; resetAt: number };

export type RateLimitOptions = {
  max?: number;
  windowMs?: number;
};

export function rateLimit(opts: RateLimitOptions = {}) {
  const max = opts.max ?? 60;
  const windowMs = opts.windowMs ?? 60_000;
  const store = new Map<string, Bucket>();

  return new Elysia({ name: `rate-limit:${max}:${windowMs}` }).onBeforeHandle(
    ({ request, set }) => {
      const auth = request.headers.get("authorization");
      const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
      const xff = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      const key = bearer ?? xff ?? "anonymous";

      const now = Date.now();
      const bucket = store.get(key);
      if (!bucket || bucket.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        set.headers ??= {};
        set.headers["x-ratelimit-limit"] = String(max);
        set.headers["x-ratelimit-remaining"] = String(max - 1);
        set.headers["x-ratelimit-reset"] = String(now + windowMs);
        set.headers["x-ratelimit-backend"] = "memory";
        return;
      }
      bucket.count += 1;
      set.headers ??= {};
      set.headers["x-ratelimit-limit"] = String(max);
      set.headers["x-ratelimit-remaining"] = String(Math.max(0, max - bucket.count));
      set.headers["x-ratelimit-reset"] = String(bucket.resetAt);
      set.headers["x-ratelimit-backend"] = "memory";
      if (bucket.count > max) {
        set.status = 429;
        set.headers["retry-after"] = String(Math.ceil((bucket.resetAt - now) / 1000));
        return { error: { code: "RATE_LIMITED", message: "too many requests" } };
      }
    }
  );
}
```

- [ ] **Step 5: Create `apps/api/src/middleware/bearer-guard.ts`**

```ts
import { Elysia } from "elysia";
import { bearer } from "@elysiajs/bearer";
import { timingSafeEqual } from "node:crypto";
import { env } from "../env";

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export const bearerGuard = new Elysia({ name: "bearer-guard" })
  .use(bearer())
  .onBeforeHandle(({ bearer, set }) => {
    if (!env.API_BEARER_TOKEN) {
      set.status = 500;
      return { error: { code: "API_BEARER_TOKEN_NOT_CONFIGURED" } };
    }
    if (!bearer || !constantTimeEqual(bearer, env.API_BEARER_TOKEN)) {
      set.status = 401;
      set.headers ??= {};
      set.headers["www-authenticate"] = "Bearer";
      return { error: { code: "UNAUTHORIZED" } };
    }
  });
```

- [ ] **Step 6: Typecheck api**

Run: `cd apps/api && bun run typecheck`
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/env.ts apps/api/src/logger.ts apps/api/src/middleware
git commit -m "feat(api): add logger, security headers, rate-limit, and bearer guard middleware"
```

---

## Task 20: Compose Elysia app + graceful shutdown

**Files:**
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Replace `apps/api/src/index.ts`**

```ts
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { env } from "./env";
import { logger } from "./logger";
import { securityHeaders } from "./middleware/security-headers";
import { rateLimit } from "./middleware/rate-limit";
import { bearerGuard } from "./middleware/bearer-guard";

function mapStatus(code: string): number {
  switch (code) {
    case "VALIDATION":
    case "PARSE":
      return 400;
    case "NOT_FOUND":
      return 404;
    default:
      return 500;
  }
}

const app = new Elysia()
  .use(securityHeaders)
  .use(
    cors({
      origin: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["authorization", "content-type"]
    })
  )
  .onRequest(({ request }) => {
    logger.info({ method: request.method, url: request.url }, "request");
  })
  .onError(({ error, code, set }) => {
    logger.error({ err: error, code }, "error");
    set.status = mapStatus(code);
    return {
      error: {
        code,
        message: env.NODE_ENV === "production" ? "internal error" : String((error as Error)?.message ?? error)
      }
    };
  })
  .get("/health", () => ({ ok: true }))
  .group("/protected", (a) =>
    a
      .use(bearerGuard)
      .use(rateLimit({ max: 60, windowMs: 60_000 }))
      .get("/me", () => ({ ok: true }))
  )
  .listen({ port: env.API_PORT, hostname: "0.0.0.0" });

logger.info({ port: env.API_PORT }, "api listening");

const drain = async () => {
  logger.info("draining…");
  await app.stop();
  process.exit(0);
};
process.on("SIGTERM", drain);
process.on("SIGINT", drain);
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/api && bun run typecheck`
Expected: exits 0.

- [ ] **Step 3: Manual smoke test (optional, requires API_BEARER_TOKEN set)**

```bash
API_BEARER_TOKEN=$(printf 'a%.0s' {1..32}) NEXT_PUBLIC_APP_URL=http://localhost:3000 NODE_ENV=development bun apps/api/src/index.ts &
API_PID=$!
sleep 1
curl -s -i http://localhost:3001/health
curl -s -i http://localhost:3001/protected/me
curl -s -i -H "Authorization: Bearer $(printf 'a%.0s' {1..32})" http://localhost:3001/protected/me
kill $API_PID
```
Expected: `/health` → 200; `/protected/me` without bearer → 401; with bearer → 200; both 401 and 200 responses include `X-Content-Type-Options: nosniff` and `X-RateLimit-Backend: memory`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/index.ts
git commit -m "feat(api): compose hardened Elysia app with bearer guard, rate limit, and graceful shutdown"
```

---

## Task 21: Rewrite `.env.example` + add `apps/web/.env.local.example`

**Files:**
- Modify: `.env.example`
- Create: `apps/web/.env.local.example`

- [ ] **Step 1: Replace `.env.example` contents**

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

- [ ] **Step 2: Create `apps/web/.env.local.example`**

```dotenv
# Public envs only — these are inlined into the client bundle.
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 3: Commit**

```bash
git add .env.example apps/web/.env.local.example
git commit -m "docs: rewrite .env.example with Foundation envs and add web .env.local.example"
```

---

## Task 22: README — "Scaling the rate limiter" section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a new subsection**

Open `README.md`. Locate the section that mentions Elysia (search for `## When to use ElysiaJS` or the `apps/api` description). Below it, add:

```markdown
## Scaling the rate limiter

`apps/api` ships an in-memory rate limiter (`apps/api/src/middleware/rate-limit.ts`).
It tracks request counts in a single-process `Map`. For multi-worker or multi-instance
deployments, replace the backing store with Redis or Upstash:

1. Install: `bun add --filter=api @upstash/ratelimit @upstash/redis`
2. Swap the `Map` in `rate-limit.ts` for an Upstash `Ratelimit` instance.
3. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in `.env`.

The middleware exposes `X-RateLimit-Backend: memory` so you can verify which store
is in use at runtime.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add 'Scaling the rate limiter' section to README"
```

---

## Task 23: Final acceptance check

- [ ] **Step 1: Run typecheck across the repo**

Run: `bun run typecheck`
Expected: exits 0.

- [ ] **Step 2: Run version pin check**

Run: `bun run check:versions`
Expected: exits 0.

- [ ] **Step 3: Run all tests**

Run: `bun run test`
Expected: all suites pass (config schema, convex withUser, convex webhook, web middleware).

- [ ] **Step 4: Convex schema dry-run (if `CONVEX_DEPLOYMENT` is set)**

Run: `cd apps/convex && bunx convex deploy --dry-run`
Expected: no schema errors.

- [ ] **Step 5: Confirm acceptance criteria from the spec**

Walk through `docs/superpowers/specs/2026-05-12-foundation-hardening-design.md` § "Acceptance criteria" and check each:
- `bun run typecheck` ✓
- `bun run test` (4 suites pass) ✓
- `bunx convex deploy --dry-run` ✓ (if env is set)
- `bun run check:versions` ✓
- Manual Stripe webhook checks (covered by tests) ✓
- Manual CSP header check (covered by middleware test) ✓
- Manual Elysia 401/200/429 (covered by step 3 of Task 20) ✓

- [ ] **Step 6: Final commit (only if any incidental files changed)**

```bash
git status
# If clean, no commit. Otherwise commit incidental fixes individually.
```

---

## Spec coverage table

| Spec section | Tasks |
|---|---|
| Section 1 — `packages/config` env module | 1, 2, 3, 4, 5 |
| Section 2 — Stripe webhook (Convex) | 7, 11, 12, 13, 14 |
| Section 3 — Convex Auth + schema columns | 6, 7, 8, 9, 10 |
| Section 4 — Next.js security headers + CSP nonces | 15, 16, 17 |
| Section 5 — Elysia hardening | 18, 19, 20 |
| Section 6 — `.env.example` | 21 |
| Section 7 — Tests | 2 (config), 9 (withUser), 12 (webhook), 15 (middleware) |
| README scaling note | 22 |
| Acceptance | 23 |
