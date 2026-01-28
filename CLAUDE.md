# CLAUDE.md

This file provides guidance for using Claude (and Claude Code) with this repository.

## Tech Stack

- **Runtime/Package Manager:** Bun 1.3.7
- **Monorepo:** Turborepo 2.7.6
- **Frontend:** Next.js 16.1.6, React 19.2.4, Tailwind CSS 4.1.18, shadcn/ui
- **Backend:** Convex 1.31.6 (primary), ElysiaJS 1.4.22 (optional API gateway)
- **Validation:** Zod 3.23.8
- **Language:** TypeScript 5.9.3 (strict mode)

## Directory Structure

```
apps/
  web/          # Next.js frontend (App Router, shadcn/ui)
  convex/       # Convex backend (schema, functions, http endpoints)
  api/          # Optional ElysiaJS API gateway (webhooks, OAuth, streaming)
  worker/       # Background worker & eval runner

packages/
  prompts/      # Versioned AI prompt templates with registry
  ai/           # AI utilities & typed tool definitions
  schemas/      # Zod schema definitions
  evals/        # Evaluation harness for prompt regression testing
  shared/       # Shared utilities
  config/       # Centralized configuration
```

## Common Commands

```bash
bun run build         # Build all packages
bun run typecheck     # TypeScript validation across workspaces
bun run lint          # ESLint validation
bun run test          # Run tests
bun run format        # Prettier formatting
bun run check:versions  # Verify pinned dependency versions
```

## How Claude should help

- Assist with feature implementation using existing patterns
- Refactor safely without breaking Convex schemas or version pins
- Generate prompts, eval datasets, and tool schemas
- Help reason about AI workflows, not just write code

## Project-specific guidance

- Convex is the primary backend; avoid duplicating logic elsewhere
- Use `packages/prompts` for prompt templates (versioned in Git)
- Use `packages/schemas` for Zod schema definitions
- Add new AI tools as typed functions in `packages/ai`
- Run evals from `packages/evals` to prevent prompt regressions
- Prefer composition over large abstractions

## Best practices

- Make changes incrementally
- Explain reasoning before large refactors
- Call out trade-offs explicitly
- Never silently change dependency versions (all versions are pinned)
- Respect the Convex-first architecture

## References

- https://agents.md/
- https://claude.com/blog/using-claude-md-files
- https://www.anthropic.com/engineering/claude-code-best-practices
