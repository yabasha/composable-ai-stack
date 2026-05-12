import { test, expect, describe } from "bun:test";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

// `convex-test` normally discovers modules via Vite's `import.meta.glob`, which
// Bun's test runner does not implement. We provide the module map manually so
// the same tests work under `bun test`. Keys must be paths relative to this
// file and must include the `_generated` directory so convex-test can derive
// the module prefix.
const modules = {
  "../auth.ts": () => import("../auth"),
  "../http.ts": () => import("../http"),
  "../schema.ts": () => import("../schema"),
  "../users.ts": () => import("../users"),
  "../_generated/api.js": () => import("../_generated/api.js"),
  "../_generated/server.js": () => import("../_generated/server.js")
};

describe("requireUser", () => {
  test("users.me throws when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.users.me, {})).rejects.toThrow(/UNAUTHENTICATED/);
  });

  test("users.me returns the user doc when authenticated", async () => {
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.users.updateProfile, { name: "x" })).rejects.toThrow(/UNAUTHENTICATED/);
  });
});
