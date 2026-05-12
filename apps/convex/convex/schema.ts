import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * Schema includes auth tables from @convex-dev/auth plus app-specific tables.
 * When extending the users table, we must re-declare all default auth fields
 * since overriding replaces the entire table definition.
 */
export default defineSchema({
  ...authTables,

  users: defineTable({
    email: v.string(), // tightened from authTables (optional); required for Password+Stripe flow
    tokenIdentifier: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),

    // Convex Auth optional user fields (kept for compatibility with authTables).
    phone: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    stripeCustomerId: v.optional(v.string()),
    plan: v.optional(v.string()), // e.g. "free" | "pro"
    planStatus: v.optional(v.string()), // e.g. "active" | "past_due" | "canceled"
    planUpdatedAt: v.optional(v.number()),

    createdAt: v.number()
  })
    .index("by_email", ["email"])
    .index("by_token", ["tokenIdentifier"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

  processedStripeEvents: defineTable({
    eventId: v.string(),
    type: v.string(),
    processedAt: v.number()
  }).index("by_event_id", ["eventId"])
});
