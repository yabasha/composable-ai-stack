// SITE_URL is set via `bunx convex env set SITE_URL <url>` and lives in the
// Convex dashboard, not in @acme/config (which never reaches Convex's runtime
// for SITE_URL specifically — it's read here only).
export default {
  providers: [
    {
      domain: process.env.SITE_URL!,
      applicationID: "convex"
    }
  ]
};
