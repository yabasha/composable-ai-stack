import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, requireUserDoc } from "./_lib/withUser";

export const me = query({
  args: {},
  handler: async (ctx) => requireUserDoc(ctx)
});

export const updateProfile = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await requireUser(ctx);
    await ctx.db.patch(userId, { name });
  }
});
