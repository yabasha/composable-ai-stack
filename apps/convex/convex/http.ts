import { httpRouter } from "convex/server";

const http = httpRouter();

// Example placeholder webhook route.
// Replace handler with Stripe verification + event handling.
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: async () => new Response("ok", { status: 200 }),
});

export default http;
