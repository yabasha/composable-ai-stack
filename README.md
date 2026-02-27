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
- `bun run eval` — run eval harness

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

---

## Guardrail Pattern

The `@acme/ai` package provides a guardrail pattern for safe, validated LLM calls:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Input     │────▶│    Zod      │────▶│ Moderation  │────▶│  LLM Call   │
│   (raw)     │     │ Validation  │     │   Hook      │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                   │
                    ┌─────────────┐     ┌─────────────┐           │
                    │   Output    │◀────│    Zod      │◀──────────┘
                    │  (typed)    │     │ Validation  │
                    └─────────────┘     └─────────────┘
```

### Usage Example

```ts
import { z } from 'zod';
import { runWithGuardrails, openai, DEFAULT_MODELS } from '@acme/ai';

const inputSchema = z.object({ message: z.string().max(500) });
const outputSchema = z.object({ reply: z.string(), confidence: z.number() });

const result = await runWithGuardrails(
  openai(DEFAULT_MODELS.openai),
  'Generate a helpful reply',
  { message: 'Hello, I need help!' },
  {
    name: 'support-reply',
    inputSchema,
    outputSchema,
    moderationHook: async (input) => input.message.length > 0,
  }
);

console.log(result.output); // { reply: '...', confidence: 0.95 }
console.log(result.traceId); // Langfuse trace ID
```

All guardrail runs are automatically traced to Langfuse with full input/output logging.

---

## Observability

This stack uses **Langfuse** for LLM observability and tracing:

### Required Environment Variables

```bash
# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...

# Langfuse (Observability)
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com  # Optional: use your self-hosted instance
```

### Features

- **Automatic tracing**: Every LLM call via `tracedGenerate()` or `runWithGuardrails()` is traced
- **Generation tracking**: Prompts, outputs, token usage, and latency are captured
- **Score logging**: Eval scores are sent to Langfuse for monitoring
- **Self-hosted option**: Run your own Langfuse instance by changing `LANGFUSE_BASE_URL`

---

## Author

Created by **Bashar Ayyash** — [yabasha.dev](https://yabasha.dev)
