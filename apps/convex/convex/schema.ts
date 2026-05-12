import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    email: v.string(),
    tokenIdentifier: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),

    // Convex Auth optional user fields (kept for compatibility with authTables).
    phone: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    stripeCustomerId: v.optional(v.string()),
    plan: v.optional(v.string()),
    planStatus: v.optional(v.string()),
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
  }).index("by_eventId", ["eventId"])
});
