// Bun's test runner doesn't implement `import.meta.glob` (Vite-only), so we
// supply the modules map convex-test needs by hand. Include every Convex
// function module plus the generated namespaces so convex-test can derive its
// prefix. Add new modules here when adding new Convex files under `convex/`.
export const testModules = {
  "./auth.ts": () => import("../auth"),
  "./http.ts": () => import("../http"),
  "./schema.ts": () => import("../schema"),
  "./users.ts": () => import("../users"),
  // @ts-ignore Task 13 will create `../stripe`; until then the import fails at
  // runtime and the catch yields an empty module, which is fine for tests that
  // don't touch Stripe.
  "./stripe.ts": () => import("../stripe").catch(() => ({})),
  "./_generated/api.js": () => import("../_generated/api"),
  "./_generated/server.js": () => import("../_generated/server")
};
