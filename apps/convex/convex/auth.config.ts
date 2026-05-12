// SITE_URL is set per Convex deployment via `bunx convex env set SITE_URL <url>`
// and lives in the Convex dashboard, not in @acme/config (it's only read here
// and never reaches Next/Elysia/Worker).
const domain = process.env.SITE_URL;
if (!domain) {
  throw new Error(
    "SITE_URL is not set on this Convex deployment. " +
      "Run: bunx convex env set SITE_URL <https-url-of-your-deployment>"
  );
}

export default {
  providers: [
    {
      domain,
      // Required literal for Convex Auth (identifies the JWT audience as the Convex backend).
      applicationID: "convex"
    }
  ]
};
