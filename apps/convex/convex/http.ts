import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth.config";

const http = httpRouter();

// Auth HTTP handler
auth.addHttpRoutes(http);

// Example placeholder webhook route.
// Replace handler with Stripe verification + event handling.
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (_ctx, _request) => {
    return new Response("ok", { status: 200 });
  }),
});

export default http;
