import { Elysia } from "elysia";
import { bearer } from "@elysiajs/bearer";
import { timingSafeEqual } from "node:crypto";
import { env } from "../env";

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export const bearerGuard = new Elysia({ name: "bearer-guard" })
  .use(bearer())
  .onBeforeHandle({ as: "global" }, ({ bearer, set }) => {
    if (!env.API_BEARER_TOKEN) {
      set.status = 500;
      return { error: { code: "API_BEARER_TOKEN_NOT_CONFIGURED" } };
    }
    if (!bearer || !constantTimeEqual(bearer, env.API_BEARER_TOKEN)) {
      set.status = 401;
      set.headers ??= {};
      set.headers["www-authenticate"] = "Bearer";
      return { error: { code: "UNAUTHORIZED" } };
    }
  });
