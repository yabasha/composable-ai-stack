import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { env } from "./env";
import { logger } from "./logger";
import { securityHeaders } from "./middleware/security-headers";
import { rateLimit } from "./middleware/rate-limit";
import { bearerGuard } from "./middleware/bearer-guard";

function mapStatus(code: string | number): number {
  switch (code) {
    case "VALIDATION":
    case "PARSE":
      return 400;
    case "NOT_FOUND":
      return 404;
    default:
      return 500;
  }
}

const app = new Elysia()
  .use(securityHeaders)
  .use(
    cors({
      origin: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["authorization", "content-type"]
    })
  )
  .onRequest(({ request }) => {
    logger.info({ method: request.method, url: request.url }, "request");
  })
  .onError(({ error, code, set }) => {
    logger.error({ err: error, code }, "error");
    set.status = mapStatus(code);
    return {
      error: {
        code,
        message: env.NODE_ENV === "production" ? "internal error" : String((error as Error)?.message ?? error)
      }
    };
  })
  .get("/health", () => ({ ok: true }))
  .group("/protected", (a) =>
    a
      .use(bearerGuard)
      .use(rateLimit({ max: 60, windowMs: 60_000 }))
      .get("/me", () => ({ ok: true }))
  )
  .listen({ port: env.API_PORT, hostname: "0.0.0.0" });

logger.info({ port: env.API_PORT }, "api listening");

const drain = async () => {
  logger.info("draining…");
  await app.stop();
  process.exit(0);
};
process.on("SIGTERM", drain);
process.on("SIGINT", drain);
