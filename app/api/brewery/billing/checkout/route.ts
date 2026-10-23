import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getBreweryContext } from "@/lib/brewery/access";
import { getBillingBaseUrl, getStripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Choose a monthly or annual billing plan." }, { status: 400 });
    }
    const plan = typeof body === "object" && body !== null && "plan" in body
      ? body.plan
      : null;
    if (plan !== "monthly" && plan !== "yearly") {
      return NextResponse.json({ error: "Choose a monthly or annual billing plan." }, { status: 400 });
    }

    const { user, account, isOwner } = await getBreweryContext();
    if (!account) return NextResponse.json({ error: "Submit a business application first." }, { status: 404 });
    if (!isOwner) return NextResponse.json({ error: "Only the business owner can manage billing." }, { status: 403 });
    if (account.status !== "approved") return NextResponse.json({ error: "Your business application must be approved before checkout." }, { status: 403 });
    if (
      account.stripe_subscription_id &&
      ["active", "trialing", "past_due"].includes(account.stripe_subscription_status ?? "")
    ) {
      return NextResponse.json({ error: "This brewery already has an active subscription." }, { status: 409 });
    }
    const priceId = plan === "monthly"
      ? process.env.STRIPE_BREWERY_MONTHLY_PRICE_ID
      : process.env.STRIPE_BREWERY_YEARLY_PRICE_ID;
    if (!priceId) return NextResponse.json({ error: "Business billing is not configured yet." }, { status: 503 });

    const stripe = getStripeClient();
    const baseUrl = getBillingBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      client_reference_id: account.id,
      customer: account.stripe_customer_id ?? undefined,
      customer_email: account.stripe_customer_id ? undefined : user.email ?? undefined,
      metadata: { brewery_id: account.id, owner_id: user.id },
      subscription_data: {
        metadata: { brewery_id: account.id, owner_id: user.id },
      },
      success_url: `${baseUrl}/business/manage?checkout=success`,
      cancel_url: `${baseUrl}/business/manage?checkout=cancelled`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Could not create brewery checkout session", error);
    const unauthorized = error instanceof Error && error.message === "Authentication required";
    return NextResponse.json(
      { error: unauthorized ? error.message : "Could not start brewery checkout." },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
