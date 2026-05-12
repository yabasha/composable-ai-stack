import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

/**
 * Returns the authenticated user's id, or throws `UNAUTHENTICATED`.
 *
 * Looks at Convex Auth's session first, then falls back to
 * `ctx.auth.getUserIdentity()` + the `users.by_token` index. The fallback path
 * is what makes this guard testable via `convex-test`'s `withIdentity` helper,
 * which injects an identity without spinning up a real Convex Auth session.
 */
export async function requireUser(ctx: Ctx): Promise<Id<"users">> {
  const direct = await getAuthUserId(ctx);
  if (direct) return direct;

  const identity = await ctx.auth.getUserIdentity();
  if (identity?.tokenIdentifier) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();
    if (user) return user._id;
  }

  throw new ConvexError({ code: "UNAUTHENTICATED" });
}

export async function requireUserDoc(ctx: Ctx) {
  const userId = await requireUser(ctx);
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });
  return user;
}
