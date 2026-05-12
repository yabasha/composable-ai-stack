import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { getStripe } from "./_lib/stripe";
import { env } from "./_lib/env";
import type Stripe from "stripe";

const http = httpRouter();

// Mount Convex Auth routes (`/api/auth/*`).
auth.addHttpRoutes(http);

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      return new Response("STRIPE_WEBHOOK_SECRET not configured", { status: 500 });
    }

    const body = await request.text();
    const sig = request.headers.get("stripe-signature");
    if (!sig) return new Response("missing signature", { status: 400 });

    const stripe = getStripe();
    let event: Stripe.Event;
    try {
      // Convex runs httpActions in a Web-style runtime with SubtleCrypto, so use
      // the async verifier to avoid sync-HMAC errors.
      event = await stripe.webhooks.constructEventAsync(
        body,
        sig,
        env.STRIPE_WEBHOOK_SECRET,
        env.WEBHOOK_TOLERANCE_SECONDS
      );
    } catch {
      return new Response("invalid signature", { status: 400 });
    }

    // Check for replay BEFORE applying side effects. The marker is written at
    // the end so a failed apply leaves the event eligible for Stripe retries
    // instead of being silently swallowed.
    const alreadyProcessed = await ctx.runQuery(internal.stripe.hasProcessedEvent, {
      eventId: event.id
    });
    if (alreadyProcessed) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const item = sub.items.data[0]?.price;
        await ctx.runMutation(internal.stripe.applySubscriptionChange, {
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          status: sub.status,
          plan: item?.lookup_key ?? item?.id ?? null
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await ctx.runMutation(internal.stripe.applySubscriptionChange, {
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          status: "canceled",
          plan: null
        });
        break;
      }
      default:
        console.info("unhandled stripe event type", event.type);
    }

    // Record only after the apply path completed successfully.
    await ctx.runMutation(internal.stripe.recordEvent, {
      eventId: event.id,
      type: event.type
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  })
});

export default http;
