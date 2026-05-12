import { parseEnv, type Env } from "./schema";

if (process.env.NODE_ENV !== "production") {
  // Best-effort .env loading in non-prod; ignore if dotenv is absent.
  try {
    const dotenv = await import("dotenv");
    dotenv.config();
  } catch {
    // dotenv is an optional runtime convenience; production deploys inject env directly.
  }
}

const mode = process.env.NODE_ENV ?? "development";
export const env: Env = Object.freeze(parseEnv(process.env, mode));
