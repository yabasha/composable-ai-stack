# apps/api — Use cases (ElysiaJS)

## 1) API gateway in front of Convex
Use this service when you need a classic HTTP API boundary:
- Validate requests
- Authenticate
- Call Convex functions server-to-server
- Stream responses

## 2) Stripe / webhook edge cases
Convex can handle webhooks via HTTP Actions, but if you want:
- dedicated IP allowlists
- aggressive rate limits
- custom signature verification flow
...you can land webhooks here.

## 3) Long-lived streaming endpoints
When you want a single endpoint that:
- streams model output
- calls tools mid-stream
- emits UI events
Elysia is a nice place to host it.

## Rule of thumb
- Convex-first for app state + business logic.
- Elysia only when you need "API server behavior".
