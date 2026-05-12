import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

function makeReq(path = "/"): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

describe("middleware CSP", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
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

  test("development CSP includes 'unsafe-eval' and ws://localhost; omits upgrade-insecure-requests", async () => {
    process.env.NODE_ENV = "development";
    const res = await middleware(makeReq("/"));
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws://localhost:*");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  test("production CSP omits 'unsafe-eval' and includes upgrade-insecure-requests", async () => {
    process.env.NODE_ENV = "production";
    const res = await middleware(makeReq("/"));
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  test("CSP includes the Convex URL in connect-src", async () => {
    const res = await middleware(makeReq("/"));
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).toContain("https://example.convex.cloud");
    expect(csp).toContain("wss://example.convex.cloud");
  });
});
