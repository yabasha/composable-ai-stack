# apps/web

Next.js app (React 19) with **Tailwind CSS v4.1.18** and **shadcn/ui** pre-wired.

## What lives here
- `app/` — Next.js App Router routes + layouts
- `components/` — UI components (shadcn/ui pattern)
- `lib/` — `cn()` helper, etc.

## Tailwind v4.1 notes
- Tailwind is loaded via `@import "tailwindcss";` in `app/globals.css`.
- PostCSS uses `@tailwindcss/postcss` in `postcss.config.mjs`.

## Dev
From repo root:

```bash
bun run dev:web
```
