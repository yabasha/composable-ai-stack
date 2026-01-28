# Composable AI Stack (CAS) | (Bun + Turborepo + Convex-first)
## A modular AI stack that scales from local tools to enterprise systems

- Name: Composable AI Stack
- Short: CAS
- Repo slug: cas or composable-ai-stack
- Package scope (if you publish): @cas/* or @composable-ai/*
- Docs title line: Composable AI Stack (CAS)
- One-liner tagline: A modular AI stack that scales from local tools to enterprise systems.
---
## Overview
A reusable monorepo template for **AI-Integrated SaaS apps**:
- **apps/web**: Next.js + Tailwind + shadcn/ui
- **apps/convex**: Convex backend (schema + functions + HTTP endpoints)
- **apps/api**: Optional ElysiaJS (Bun) API gateway
- **apps/worker**: background tasks + eval runner CLI (Bun)
- **packages/**: shared prompts, schemas, AI utilities, eval harness, configs

> Goal: be your modular AI stack that scales from local tools to enterprise systems

---

## Requirements
- **Bun**
- A **Convex** project (free tier works for prototyping)
- Optional: **Stripe** account for memberships

---

## Quick Start

### 1) Install dependencies (root)
```bash
bun install
```

### 2) Copy env and fill values
```bash
cp .env.example .env
```

### 3) Run development
In separate terminals:
```bash
bun run dev:convex
bun run dev:web
# optional
bun run dev:api
```

Or run everything:
```bash
bun run dev
```

---

## Convex Setup
From `apps/convex`:
```bash
cd apps/convex
bunx convex dev
```

Convex will output a deployment URL. Set:
- `NEXT_PUBLIC_CONVEX_URL` in `.env` (and/or `apps/web/.env.local`)

---

## shadcn/ui + Tailwind
`apps/web` is preconfigured with Tailwind and a minimal shadcn/ui setup.

Add a shadcn component (from within `apps/web`):
```bash
cd apps/web
bunx shadcn@latest add button
```

Where to tweak:
- `apps/web/components.json`
- `apps/web/tailwind.config.ts`
- `apps/web/app/globals.css`

---

## Memberships / Billing (Convex-first)
Template includes placeholders for:
- membership fields in `apps/convex/convex/schema.ts`
- a webhook route in `apps/convex/convex/http.ts` (`/stripe/webhook`)

Typical flow:
1) Create checkout session in a Convex action (server-side)
2) Stripe redirects user back to your app
3) Stripe sends webhook events to `/stripe/webhook`
4) Convex updates your `users.planStatus`

If you want a dedicated webhook gateway with custom middleware/rate limiting, use `apps/api` (ElysiaJS).

---

## Scripts (root)
- `bun run dev` — dev for all apps
- `bun run dev:web` — Next.js only
- `bun run dev:convex` — Convex only
- `bun run dev:api` — Elysia only
- `bun run build` — build all buildable apps
- `bun run eval` — run eval harness (placeholder)

---

## Repo Layout
```txt
apps/
  web/
  convex/
  api/
  worker/

packages/
  shared/
  schemas/
  prompts/
  ai/
  evals/
  config/
```

See `use-cases.md` and `apps/api/use-cases.md`.

## UI Stack
- Web UI uses **Tailwind CSS v4.1** + **shadcn/ui**.

## Versions (template defaults)
Pinned to your requested versions:

- Bun: **1.3.7**
- Turborepo (turbo): **2.7.6**
- TypeScript: **5.9.3**
- Prettier: **3.8.1**
- Next.js: **16.1.6** (App Router)
- React: **19.2.4**
- Tailwind CSS: **4.1.18**
- Elysia: **1.4.22**
- Convex: **1.31.6**
- ESLint: **9.39.2**

## Keeping versions pinned
Run:
```bash
bun run check:versions
```
CI will fail if any pinned dependency versions drift.
