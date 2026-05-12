import { test, expect, describe } from "bun:test";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";
import { testModules } from "./test-modules";

describe("requireUser", () => {
  test("users.me throws when unauthenticated", async () => {
    const t = convexTest(schema, testModules);
    await expect(t.query(api.users.me, {})).rejects.toThrow(/UNAUTHENTICATED/);
  });

  test("users.me returns the user doc when authenticated", async () => {
    const t = convexTest(schema, testModules);
    const userId = await t.run(async (ctx) => {
      return ctx.db.insert("users", {
        email: "alice@example.com",
        tokenIdentifier: "convex:alice",
        createdAt: Date.now()
      });
    });
    const asAlice = t.withIdentity({ tokenIdentifier: "convex:alice", subject: userId });
    const me = await asAlice.query(api.users.me, {});
    expect(me?.email).toBe("alice@example.com");
  });

  test("users.updateProfile writes name for the authenticated user", async () => {
    const t = convexTest(schema, testModules);
    const userId = await t.run(async (ctx) => {
      return ctx.db.insert("users", {
        email: "alice@example.com",
        tokenIdentifier: "convex:alice",
        createdAt: Date.now()
      });
    });
    const asAlice = t.withIdentity({ tokenIdentifier: "convex:alice", subject: userId });
    await asAlice.mutation(api.users.updateProfile, { name: "Alice Smith" });
    const after = await t.run((ctx) => ctx.db.get(userId));
    expect(after?.name).toBe("Alice Smith");
  });

  test("users.updateProfile throws when unauthenticated", async () => {
    const t = convexTest(schema, testModules);
    await expect(t.mutation(api.users.updateProfile, { name: "x" })).rejects.toThrow(/UNAUTHENTICATED/);
  });
});
