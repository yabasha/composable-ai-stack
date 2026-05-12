import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { convexTest } from "convex-test";
import Stripe from "stripe";
import schema from "./schema";
import { testModules } from "./_lib/test-modules";

const SECRET = "whsec_test_secret_value";

async function signedRequest(body: string, secret: string): Promise<Request> {
  const stripe = new Stripe("sk_test_x", { apiVersion: "2026-04-22.dahlia" });
  // Bun resolves stripe's "worker" export, which only provides SubtleCrypto
  // (async-only). Use the async helper to avoid the sync HMAC error.
  const header = await stripe.webhooks.generateTestHeaderStringAsync({ payload: body, secret });
  return new Request("https://convex.example/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": header, "content-type": "application/json" },
    body
  });
}

const baseEvent = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    id: "evt_test_1",
    type: "customer.subscription.updated",
    data: {
      object: {
        customer: "cus_test_1",
        status: "active",
        items: { data: [{ price: { id: "price_x", lookup_key: "pro_monthly" } }] }
      }
    },
    ...overrides
  });

describe("POST /stripe/webhook", () => {
  const prevEnv = {
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL
  };

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  test("returns 400 when Stripe-Signature is missing", async () => {
    const t = convexTest(schema, testModules);
    const res = await t.fetch("/stripe/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: baseEvent()
    });
    expect(res.status).toBe(400);
  });

  test("returns 400 when the signature is invalid", async () => {
    const t = convexTest(schema, testModules);
    const body = baseEvent();
    const req = await signedRequest(body, "whsec_wrong_secret");
    const res = await t.fetch("/stripe/webhook", {
      method: "POST",
      headers: Object.fromEntries(req.headers.entries()),
      body
    });
    expect(res.status).toBe(400);
  });

  test("returns 200 on valid signature and updates the user plan", async () => {
    const t = convexTest(schema, testModules);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "alice@example.com",
        stripeCustomerId: "cus_test_1",
        createdAt: Date.now()
      })
    );
    const body = baseEvent();
    const req = await signedRequest(body, SECRET);
    const res = await t.fetch("/stripe/webhook", {
      method: "POST",
      headers: Object.fromEntries(req.headers.entries()),
      body
    });
    expect(res.status).toBe(200);
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", "cus_test_1"))
        .first()
    );
    expect(user?.planStatus).toBe("active");
    expect(user?.plan).toBe("pro_monthly");
  });

  test("replay of the same event id is idempotent", async () => {
    const t = convexTest(schema, testModules);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "alice@example.com",
        stripeCustomerId: "cus_test_1",
        createdAt: Date.now()
      })
    );
    const body = baseEvent();
    const req1 = await signedRequest(body, SECRET);
    await t.fetch("/stripe/webhook", {
      method: "POST",
      headers: Object.fromEntries(req1.headers.entries()),
      body
    });
    const req2 = await signedRequest(body, SECRET);
    const res2 = await t.fetch("/stripe/webhook", {
      method: "POST",
      headers: Object.fromEntries(req2.headers.entries()),
      body
    });
    expect(res2.status).toBe(200);
    const events = await t.run((ctx) => ctx.db.query("processedStripeEvents").collect());
    expect(events.length).toBe(1);
  });

  test("customer.subscription.deleted sets planStatus to canceled", async () => {
    const t = convexTest(schema, testModules);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "alice@example.com",
        stripeCustomerId: "cus_test_1",
        planStatus: "active",
        plan: "pro_monthly",
        createdAt: Date.now()
      })
    );
    const body = baseEvent({ id: "evt_test_2", type: "customer.subscription.deleted" });
    const req = await signedRequest(body, SECRET);
    const res = await t.fetch("/stripe/webhook", {
      method: "POST",
      headers: Object.fromEntries(req.headers.entries()),
      body
    });
    expect(res.status).toBe(200);
    const user = await t.run((ctx) =>
      ctx.db
        .query("users")
        .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", "cus_test_1"))
        .first()
    );
    expect(user?.planStatus).toBe("canceled");
    expect(user?.plan).toBeUndefined();
  });
});
