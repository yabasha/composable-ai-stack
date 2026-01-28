# apps/worker — Use cases

## 1) Run eval suites
Execute golden-set tests for prompts/models, fail CI on regressions.

## 2) Offline processing
- batch embeddings
- report generation
- log compaction / exports

## 3) Admin scripts
Seed data, migrate data, cleanup jobs.

## Tip
Keep worker scripts idempotent — safe to run multiple times.
