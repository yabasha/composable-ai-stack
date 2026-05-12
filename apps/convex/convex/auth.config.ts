// SITE_URL is set per Convex deployment via `bunx convex env set SITE_URL <url>`
// and lives in the Convex dashboard, not in @acme/config (it's only read here
// and never reaches Next/Elysia/Worker).
const rawSiteUrl = process.env.SITE_URL;
if (!rawSiteUrl) {
  throw new Error(
    "SITE_URL is not set on this Convex deployment. " +
      "Run: bunx convex env set SITE_URL <https-url-of-your-deployment>"
  );
}

let parsedSiteUrl: URL;
try {
  parsedSiteUrl = new URL(rawSiteUrl);
} catch {
  throw new Error(`SITE_URL must be a valid absolute URL (got: ${rawSiteUrl})`);
}

const isHttps = parsedSiteUrl.protocol === "https:";
const isLocalHttp =
  parsedSiteUrl.hostname === "localhost" && parsedSiteUrl.protocol === "http:";
if (!isHttps && !isLocalHttp) {
  throw new Error(
    `SITE_URL must be https, or http://localhost for local development (got: ${parsedSiteUrl.protocol}//${parsedSiteUrl.host})`
  );
}

// Normalize: use the origin (protocol + host[:port]) so trailing paths/slashes
// can't silently change the JWT audience.
const domain = parsedSiteUrl.origin;

export default {
  providers: [
    {
      domain,
      // Required literal for Convex Auth (identifies the JWT audience as the Convex backend).
      applicationID: "convex"
    }
  ]
};
