import { internalMutation } from "./_generated/server";

/**
 * Daily cleanup: removes users who signed up but never activated
 * their plan within 30 days.  Extend with additional cleanup logic
 * (expired sessions, orphaned data, etc.) as needed.
 */
export const removeStaleUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1_000;

    // Find users with no plan created more than 30 days ago
    const stale = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("plan"), undefined),
          q.lt(q.field("createdAt"), thirtyDaysAgo),
        ),
      )
      .collect();

    for (const user of stale) {
      await ctx.db.delete(user._id);
    }

    if (stale.length > 0) {
      console.log(`🧹 Cleaned up ${stale.length} stale user(s)`);
    }
  },
});
