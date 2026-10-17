import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe billing is not configured");
  }

  stripeClient ??= new Stripe(secretKey);
  return stripeClient;
}

export function getBillingBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  }

  const url = new URL(configuredUrl);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS");
  }
  return url.origin;
}
