import { parseEnv, type Env } from "@acme/config/schema";

const mode = process.env.NODE_ENV ?? "development";
export const env: Env = Object.freeze(parseEnv(process.env, mode));
