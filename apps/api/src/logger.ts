import pino from "pino";
import { env } from "./env";

const isProd = env.NODE_ENV === "production";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.token"
    ],
    censor: "[redacted]"
  },
  transport: isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss.l" } }
});
