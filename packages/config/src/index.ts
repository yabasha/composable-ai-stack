// Node-runtime entrypoint. Importing this module runs parseEnv against
// process.env at load time. For pure schema access (no side effects),
// import from "@acme/config/schema".
export { env } from "./node";
export type { Env, Mode } from "./schema";
