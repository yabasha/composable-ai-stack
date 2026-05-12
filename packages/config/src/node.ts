import { parseEnv, type Env } from "./schema";

if (process.env.NODE_ENV !== "production") {
  try {
    const dotenv = await import("dotenv");
    dotenv.config();
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== "ERR_MODULE_NOT_FOUND" && code !== "MODULE_NOT_FOUND") {
      console.warn("[@acme/config] dotenv load failed:", err);
    }
  }
}

const mode = process.env.NODE_ENV ?? "development";
export const env: Env = Object.freeze(parseEnv(process.env, mode));
