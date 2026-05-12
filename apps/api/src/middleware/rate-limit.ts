// In-memory rate limiter. Replace with Redis/Upstash for multi-worker deployments.
// See README → "Scaling the rate limiter".
import { Elysia } from "elysia";

type Bucket = { count: number; resetAt: number };

export type RateLimitOptions = {
  max?: number;
  windowMs?: number;
};

export function rateLimit(opts: RateLimitOptions = {}) {
  const max = opts.max ?? 60;
  const windowMs = opts.windowMs ?? 60_000;
  const store = new Map<string, Bucket>();

  return new Elysia({ name: `rate-limit:${max}:${windowMs}` }).onBeforeHandle(
    { as: "global" },
    ({ request, set }) => {
      const auth = request.headers.get("authorization");
      const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
      const xff = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      const key = bearer ?? xff ?? "anonymous";

      const now = Date.now();
      const bucket = store.get(key);
      if (!bucket || bucket.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        set.headers ??= {};
        set.headers["x-ratelimit-limit"] = String(max);
        set.headers["x-ratelimit-remaining"] = String(max - 1);
        set.headers["x-ratelimit-reset"] = String(now + windowMs);
        set.headers["x-ratelimit-backend"] = "memory";
        return;
      }
      bucket.count += 1;
      set.headers ??= {};
      set.headers["x-ratelimit-limit"] = String(max);
      set.headers["x-ratelimit-remaining"] = String(Math.max(0, max - bucket.count));
      set.headers["x-ratelimit-reset"] = String(bucket.resetAt);
      set.headers["x-ratelimit-backend"] = "memory";
      if (bucket.count > max) {
        set.status = 429;
        set.headers["retry-after"] = String(Math.ceil((bucket.resetAt - now) / 1000));
        return { error: { code: "RATE_LIMITED", message: "too many requests" } };
      }
    }
  );
}
