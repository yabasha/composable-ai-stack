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

  // Extend the auth users table with app-specific fields.
  // Default auth fields must be preserved explicitly.
  users: defineTable({
    // --- Default @convex-dev/auth fields (must keep) ---
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // --- App-specific fields ---
    stripeCustomerId: v.optional(v.string()),
    plan: v.optional(v.string()),          // e.g. "free" | "pro"
    planStatus: v.optional(v.string()),    // e.g. "active" | "past_due" | "canceled"
    createdAt: v.optional(v.number()),
  }),
});
