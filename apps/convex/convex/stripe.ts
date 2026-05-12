import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Read-only duplicate check, called BEFORE applying side effects so a failed
 * apply can still be retried by Stripe (the marker is only written after
 * `recordEvent` runs at the end of successful processing).
 */
export const hasProcessedEvent = internalQuery({
  args: { eventId: v.string() },
  handler: async (ctx, { eventId }) => {
    const existing = await ctx.db
      .query("processedStripeEvents")
      .withIndex("by_event_id", (q) => q.eq("eventId", eventId))
      .first();
    return existing !== null;
  }
});

/**
 * Records a Stripe event ID after successful processing. Returns true if newly
 * recorded, false if a concurrent delivery beat us to it.
 *
 * Convex has no unique-index constraint. This is a read-then-insert; concurrent
 * deliveries of the same event could race. Stripe retries are sequential in
 * practice, so this is acceptable for a template. Forks needing strict
 * uniqueness should layer their own pattern.
 */
export const recordEvent = internalMutation({
  args: { eventId: v.string(), type: v.string() },
  handler: async (ctx, { eventId, type }) => {
    const existing = await ctx.db
      .query("processedStripeEvents")
      .withIndex("by_event_id", (q) => q.eq("eventId", eventId))
      .first();
    if (existing) return false;
    await ctx.db.insert("processedStripeEvents", {
      eventId,
      type,
      processedAt: Date.now()
    });
    return true;
  }
});

export const applySubscriptionChange = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    status: v.string(),
    plan: v.union(v.string(), v.null())
  },
  handler: async (ctx, { stripeCustomerId, status, plan }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", stripeCustomerId))
      .first();
    if (!user) {
      // Fail loud so the webhook returns non-2xx and Stripe retries. Silent
      // no-op would let the account drift permanently out of sync with Stripe.
      throw new Error(
        `No user linked to Stripe customer ${stripeCustomerId}`
      );
    }
    await ctx.db.patch(user._id, {
      planStatus: status,
      plan: plan ?? undefined,
      planUpdatedAt: Date.now()
    });
  }
});
