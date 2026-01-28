# apps/web — Use cases

## 1) Build AI-native screens (streaming + editable output)
- Use a server action / API route to stream tokens.
- Render an editable “draft” view so the user can correct output.
- Store final accepted output back into Convex as the source of truth.

## 2) Component-driven UI (shadcn/ui)
- Keep primitives in `components/ui/*`.
- Keep app-specific composites in `components/*`.
- Prefer composition over “mega-components”.

## 3) Realtime data UI
- Subscribe to Convex queries for live updates.
- Combine with optimistic UI for instant feedback.

## Folder reminders
- `app/` routes
- `components/ui/` shadcn primitives
- `lib/` utilities (cn, fetchers, etc.)
