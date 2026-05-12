import { Elysia } from "elysia";
import { env } from "../env";

const isProd = env.NODE_ENV === "production";

export const securityHeaders = new Elysia({ name: "security-headers" }).onAfterHandle(
  ({ set }) => {
    const headers = (set.headers ??= {});
    headers["x-content-type-options"] = "nosniff";
    headers["x-frame-options"] = "DENY";
    headers["referrer-policy"] = "strict-origin-when-cross-origin";
    headers["permissions-policy"] = "camera=(), microphone=(), geolocation=(), interest-cohort=()";
    if (isProd) {
      headers["strict-transport-security"] = "max-age=63072000; includeSubDomains; preload";
    }
  }
);
