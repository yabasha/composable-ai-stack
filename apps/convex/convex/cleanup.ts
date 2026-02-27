import { internalMutation } from "./_generated/server";

const CLEANUP_BATCH_SIZE = 100;

/**
 * Daily cleanup: removes users who signed up but never activated
 * their plan within 30 days.  Batched to stay within Convex mutation
 * read/write limits.  If more stale users remain, the next cron
 * invocation will pick them up.
 */
export const removeStaleUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1_000;

    // Find stale users in bounded batches to avoid mutation limits
    const stale = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("plan"), undefined),
          q.lt(q.field("createdAt"), thirtyDaysAgo),
        ),
      )
      .take(CLEANUP_BATCH_SIZE);

    for (const user of stale) {
      await ctx.db.delete(user._id);
    }

    if (stale.length > 0) {
      console.log(`🧹 Cleaned up ${stale.length} stale user(s)${stale.length === CLEANUP_BATCH_SIZE ? " (batch limit hit — more may remain)" : ""}`);
    }
  },
});
