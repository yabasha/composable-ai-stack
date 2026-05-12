# apps/convex

Convex backend (schema, queries, mutations, actions, and HTTP endpoints).

## What lives here
- `convex/schema.ts` — database schema (includes auth tables)
- `convex/http.ts` — HTTP endpoints (auth + Stripe webhooks)
- `convex/auth.config.ts` — auth provider configuration
- `convex/*` — queries/mutations/actions

## Auth Setup

This app uses `@convex-dev/auth` with Password provider for email/password authentication.

### Password Auth

Password authentication works out of the box. Users can sign up and sign in with email/password.

### Adding OAuth (GitHub, Google, etc.)

To add OAuth providers like GitHub:

1. Configure the provider in `convex/auth.config.ts`:

```ts
import { convexAuth } from '@convex-dev/auth/server';
import { GitHub } from '@convex-dev/auth/providers'; // or custom OAuth

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password,
    // Add OAuth providers here
  ],
});
```

2. Set environment variables for your OAuth app credentials:

```bash
bunx convex env set AUTH_GITHUB_ID=your_github_oauth_app_id
bunx convex env set AUTH_GITHUB_SECRET=your_github_oauth_app_secret
bunx convex env set SITE_URL=http://localhost:3000
```

See the [Convex Auth docs](https://labs.convex.dev/auth) for more details.

## Dev

```bash
bun run dev:convex
```

## Deploy

```bash
bun run --cwd apps/convex deploy
```
