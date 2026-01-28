# AGENTS.md

This repository follows the **AGENTS.md** convention for AI coding assistants.

## Purpose
AGENTS.md provides context and guardrails so AI agents can:
- understand project structure quickly
- follow architectural decisions
- avoid destructive or off-pattern changes

## Stack summary
- Runtime: Bun
- Monorepo: Turborepo
- Frontend: Next.js (App Router) + Tailwind v4 + shadcn/ui
- Backend: Convex-first
- Optional API gateway: ElysiaJS
- AI patterns: prompt versioning, eval harness, tool schemas

## Core rules for agents
- Prefer Convex functions for business logic
- Do NOT introduce extra backends unless justified
- Keep prompts in `packages/prompts`
- Keep schemas in `packages/schemas`
- All new shared logic goes into `packages/*`
- Respect pinned dependency versions (see `check-versions.ts`)

## Safe defaults
- Type-safe APIs only
- Streaming-first AI UX
- Convex as source of truth for app state
