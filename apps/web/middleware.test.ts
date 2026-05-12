import { test, expect, describe, beforeEach } from "bun:test";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

function makeReq(path = "/"): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

describe("middleware CSP", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
  });

  test("sets a nonce on the request and CSP on the response", async () => {
    const res = await middleware(makeReq("/"));
    const csp = res.headers.get("content-security-policy");
    expect(csp).toBeTruthy();
    const nonceMatch = csp!.match(/'nonce-([A-Za-z0-9+/=]+)'/);
    expect(nonceMatch).not.toBeNull();
    const nonce = nonceMatch![1];
    expect(csp).toContain(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
    expect(csp).toContain(`style-src 'self' 'nonce-${nonce}'`);
  });

  test("development CSP includes 'unsafe-eval' and ws://localhost", async () => {
    process.env.NODE_ENV = "development";
    const res = await middleware(makeReq("/"));
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws://localhost:*");
  });

  test("production CSP omits 'unsafe-eval'", async () => {
    process.env.NODE_ENV = "production";
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
    process.env.CONVEX_DEPLOYMENT = "prod:abc";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    process.env.API_BEARER_TOKEN = "a".repeat(32);
    const res = await middleware(makeReq("/"));
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).not.toContain("'unsafe-eval'");
  });

  test("CSP includes the Convex URL in connect-src", async () => {
    const res = await middleware(makeReq("/"));
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).toContain("https://example.convex.cloud");
    expect(csp).toContain("wss://example.convex.cloud");
  });
});
