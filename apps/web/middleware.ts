import { NextResponse, type NextRequest } from "next/server";
import { envSchema } from "@acme/config/schema";

function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // base64 without padding
  return btoa(String.fromCharCode(...bytes)).replace(/=+$/, "");
}

function convexWss(url: string | undefined): string {
  if (!url) return "";
  return url.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
}

export function middleware(req: NextRequest) {
  // Parse env per-request — Edge runtime is fast, this keeps test mocking simple.
  // Production schema enforcement happens at app boot via @acme/config (Node).
  const env = envSchema.parse({ ...process.env });
  const nonce = makeNonce();
  const isProd = env.NODE_ENV === "production";
  const convexHttp = env.NEXT_PUBLIC_CONVEX_URL ?? "";
  const convexWs = convexWss(convexHttp);

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    !isProd && "'unsafe-eval'"
  ]
    .filter(Boolean)
    .join(" ");

  const connectSrc = [
    "'self'",
    convexHttp,
    convexWs,
    !isProd && "ws://localhost:*",
    !isProd && "http://localhost:*"
  ]
    .filter(Boolean)
    .join(" ");

  // TODO(fork): add Stripe (https://js.stripe.com, https://api.stripe.com)
  // and analytics origins to script-src / connect-src as needed.
  const csp = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' blob: data:`,
    `font-src 'self' data:`,
    `connect-src ${connectSrc}`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("content-security-policy", csp);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]
};
