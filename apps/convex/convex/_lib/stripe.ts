import Stripe from "stripe";
import { env } from "./env";

// Pinned to the SDK's current default for the pinned `stripe` package version.
// When bumping the stripe dep, review the changelog and update this constant.
const API_VERSION = "2026-04-22.dahlia" as const;

let cached: Stripe | undefined;

export function getStripe(): Stripe {
  if (!cached) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is required to use the Stripe client");
    }
    cached = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: API_VERSION });
  }
  return cached;
}
