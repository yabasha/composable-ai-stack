import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * Schema includes auth tables from @convex-dev/auth plus app-specific tables.
 */
export default defineSchema({
  ...authTables,
  
  users: defineTable({
    email: v.string(),
    stripeCustomerId: v.optional(v.string()),
    plan: v.optional(v.string()),          // e.g. "free" | "pro"
    planStatus: v.optional(v.string()),    // e.g. "active" | "past_due" | "canceled"
    createdAt: v.number()
  }).index("by_email", ["email"])
});
