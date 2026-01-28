import { Elysia } from "elysia";

/**
 * Optional API gateway.
 * Use this when you want a classic HTTP surface with middleware, webhooks, or non-Convex clients.
 */
const app = new Elysia()
  .get("/health", () => ({ ok: true }))
  .listen(3001);

console.log(`API listening on http://localhost:${app.server?.port}`);
