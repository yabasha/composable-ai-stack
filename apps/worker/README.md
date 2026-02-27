# apps/worker

Background job processing for the Composable AI Stack.

## Architecture: Dual Queue Strategy

This service uses **two complementary** queuing approaches:

| | **BullMQ (Redis)** | **Convex Scheduled Functions** |
|---|---|---|
| **Where** | `apps/worker/src/workers/` | `apps/convex/convex/crons.ts` |
| **Best for** | Heavy, long-running, or external work | Lightweight DB mutations & queries |
| **Examples** | AI generation, file processing, webhook delivery, batch imports | Daily cleanup, usage aggregation, digest emails, plan expiry checks |
| **Concurrency** | Configurable per worker | Single-threaded (Convex runtime) |
| **Retry** | Built-in exponential backoff | Convex auto-retry |
| **Infra** | Requires Redis | Runs inside Convex (no extra infra) |

**Rule of thumb:** If the job talks to external APIs, takes > 1 s, or needs fine-grained concurrency control → BullMQ. If it's a periodic Convex DB operation → Convex cron.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed
- Redis running locally (or set `REDIS_URL`)

### Environment

```bash
cp .env.example .env
# Set REDIS_URL if not using default localhost:6379
```

### Run

```bash
# From repo root
bun run dev --filter=worker

# Or directly
cd apps/worker && bun run dev
```

## BullMQ Workers

### AI Job Worker (`src/workers/ai-job.worker.ts`)

Processes AI text-generation jobs. Currently a stub — replace with a real `packages/ai` call once PRs #5-#7 merge.

**Enqueue a job:**

```ts
import { aiJobQueue } from "./queues/index.js";

await aiJobQueue.add("generate", {
  prompt: "Summarise this document…",
  model: "gpt-4o-mini",
});
```

**Configuration:**

- Concurrency: 5 (per worker instance)
- Rate limit: 10 jobs / minute
- Retries: 3 with exponential backoff
- Completed jobs kept 24 h, failed jobs kept 7 d

### Adding a New Worker

1. Create `src/workers/<name>.worker.ts`
2. Define a queue in `src/queues/index.ts`
3. Import & start the worker in `src/index.ts`

## Convex Crons

Defined in `apps/convex/convex/crons.ts`. Currently includes:

- **`cleanup:stale-users`** — daily at 03:00 UTC, removes users with no plan created > 30 days ago

Add new crons in the same file using `crons.daily()`, `crons.hourly()`, `crons.interval()`, or `crons.cron()`.

## Typecheck

```bash
bun run typecheck          # from apps/worker
bun run typecheck --filter=worker  # from repo root
```
