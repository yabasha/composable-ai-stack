import { test, expect, describe } from "bun:test";
import { parseEnv } from "./schema";

const validProd = {
  NODE_ENV: "production",
  STRIPE_SECRET_KEY: "sk_test_x",
  STRIPE_WEBHOOK_SECRET: "whsec_x",
  CONVEX_DEPLOYMENT: "dev:abc",
  NEXT_PUBLIC_CONVEX_URL: "https://example.convex.cloud",
  NEXT_PUBLIC_APP_URL: "https://app.example.com",
  API_BEARER_TOKEN: "a".repeat(32)
};

describe("parseEnv", () => {
  test("parses a valid dev env and applies defaults", () => {
    const env = parseEnv({ NODE_ENV: "development" }, "development");
    expect(env.NODE_ENV).toBe("development");
    expect(env.WEBHOOK_TOLERANCE_SECONDS).toBe(300);
    expect(env.API_PORT).toBe(3001);
    expect(env.LOG_LEVEL).toBe("info");
  });

  test("parses a valid production env with all required fields", () => {
    const env = parseEnv(validProd, "production");
    expect(env.STRIPE_SECRET_KEY).toBe("sk_test_x");
    expect(env.API_BEARER_TOKEN.length).toBe(32);
  });

  test("rejects production env missing STRIPE_SECRET_KEY", () => {
    const { STRIPE_SECRET_KEY: _, ...partial } = validProd;
    expect(() => parseEnv(partial, "production")).toThrow(/STRIPE_SECRET_KEY/);
  });

  test("rejects production env with too-short API_BEARER_TOKEN", () => {
    expect(() =>
      parseEnv({ ...validProd, API_BEARER_TOKEN: "short" }, "production")
    ).toThrow(/API_BEARER_TOKEN/);
  });

  test("rejects invalid NODE_ENV value", () => {
    expect(() => parseEnv({ NODE_ENV: "staging" }, "staging")).toThrow(/NODE_ENV/);
  });

  test("rejects invalid NEXT_PUBLIC_CONVEX_URL", () => {
    expect(() =>
      parseEnv({ ...validProd, NEXT_PUBLIC_CONVEX_URL: "not-a-url" }, "production")
    ).toThrow(/NEXT_PUBLIC_CONVEX_URL/);
  });

  test("coerces numeric string envs", () => {
    const env = parseEnv(
      { NODE_ENV: "development", API_PORT: "4000", WEBHOOK_TOLERANCE_SECONDS: "60" },
      "development"
    );
    expect(env.API_PORT).toBe(4000);
    expect(env.WEBHOOK_TOLERANCE_SECONDS).toBe(60);
  });
});
