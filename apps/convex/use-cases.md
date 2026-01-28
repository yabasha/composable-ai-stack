# apps/convex — Use cases

## 1) Membership plans / subscriptions
- Store subscription status on `users`.
- Gate premium features via a `requirePlan()` helper.
- Sync Stripe webhooks into tables.

## 2) AI session + memory
- Store chat sessions, messages, tool calls.
- Keep an audit trail of AI suggestions.
- Use Convex as the realtime source of truth for the UI.

## 3) Realtime collaboration
- Presence and live cursors (if needed)
- Shared documents / workspaces
- Activity feeds

## Suggested tables
- `users`
- `workspaces`
- `memberships`
- `sessions`
- `messages`
- `audit_logs`
