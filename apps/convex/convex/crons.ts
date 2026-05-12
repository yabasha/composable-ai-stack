import { cronJobs } from "convex/server";
import type { FunctionReference } from "convex/server";

/**
 * Convex scheduled functions (crons).
 *
 * Use these for lightweight, periodic tasks that run inside Convex:
 *   - DB cleanup, aggregation, digest emails, plan expiry checks, etc.
 *
 * For heavy / long-running work (AI generation, file processing,
 * external API orchestration) use BullMQ workers in apps/worker instead.
 */
const crons = cronJobs();

/**
 * Reference to the internal cleanup mutation.
 *
 * Note: The generated `internal` object is updated by `npx convex dev`.
 * Until then we cast the reference manually so typecheck passes.
 */
const removeStaleUsers = "cleanup:removeStaleUsers" as unknown as FunctionReference<
  "mutation",
  "internal"
>;

// Run daily at 03:00 UTC — remove users who never activated
crons.daily(
  "cleanup:stale-users",
  { hourUTC: 3, minuteUTC: 0 },
  removeStaleUsers,
);

export default crons;
