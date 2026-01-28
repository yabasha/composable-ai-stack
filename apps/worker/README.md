# apps/worker

Bun-based worker/CLI area for tasks that don't belong in the request/response path.

## Use cases
- prompt eval runs in CI
- dataset generation
- import/export scripts
- scheduled jobs (if you don’t want them inside Convex)

## Run

```bash
bun run dev:worker
```
