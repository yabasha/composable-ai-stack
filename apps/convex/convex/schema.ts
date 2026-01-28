import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Minimal schema to track membership plan status.
 * Expand as needed (workspaces, roles, billing, etc.)
 */
export default defineSchema({
  users: defineTable({
    email: v.string(),
    stripeCustomerId: v.optional(v.string()),
    plan: v.optional(v.string()),          // e.g. "free" | "pro"
    planStatus: v.optional(v.string()),    // e.g. "active" | "past_due" | "canceled"
    createdAt: v.number()
  }).index("by_email", ["email"])
});
