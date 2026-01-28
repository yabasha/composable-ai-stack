# Composable AI Stack (CAS) — Use Cases

This template is designed to be a **reusable monorepo starter** for building AI‑integrated SaaS apps in 2026:
- **Next.js + Tailwind + shadcn/ui** for the product UI
- **Convex-first backend** for realtime app state, typed functions, and rapid iteration
- Optional **ElysiaJS (Bun)** API gateway for webhooks/integrations/edge endpoints
- Shared **prompts, schemas, AI utilities, eval harness** in packages/

## 1) Typical SaaS (Subscription + Dashboard)
- Use Convex to store `users`, `subscriptions`, and feature entitlements.
- Create Stripe Checkout Sessions (Convex action).
- Receive Stripe webhooks (Convex HTTP endpoint) and sync subscription state.
- Gate premium features in the UI based on `user.planStatus`.

## 2) AI Assistant inside your Product
Examples:
- Support copilot drafts replies
- “Ask your workspace” semantic search over docs
- Agent workflows (create tasks, generate reports, triage tickets)

Recommended pattern:
- Store conversations + tool results in Convex tables
- Keep prompts in `packages/prompts` (Git versioned)
- Run regression checks in `packages/evals`

## 3) Realtime Collaboration (Multi-user)
Examples:
- Live cursors / presence
- Shared documents / boards
- Realtime dashboards

Convex shines here because queries can be subscribed to realtime updates.

## 4) When to use ElysiaJS
Keep Convex as the primary backend. Add Elysia when you need:
- a dedicated webhook surface (Stripe, GitHub, etc.) with custom middleware
- a gateway for multiple backends/services
- specialized streaming endpoints (SSE) or non-Convex clients
- edge deployment requirements

See `apps/api/use-cases.md` for concrete Elysia examples.

## 5) Prompt Versioning + Evals
Prompts behave like code:
- small changes can break behavior
- they affect cost/latency/quality

So you:
- version prompts in Git (`packages/prompts`)
- run evals in CI (`packages/evals`) to prevent regressions


## UI notes

- Tailwind is set to **v4.1** in `apps/web` and uses `@tailwindcss/postcss`.
