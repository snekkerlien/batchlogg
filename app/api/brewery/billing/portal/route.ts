import { NextResponse } from "next/server";
import { getBreweryContext } from "@/lib/brewery/access";
import { getBillingBaseUrl, getStripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { account, isOwner } = await getBreweryContext();
    if (!account) return NextResponse.json({ error: "Brewery account not found." }, { status: 404 });
    if (!isOwner) return NextResponse.json({ error: "Only the business owner can manage billing." }, { status: 403 });
    if (!account.stripe_customer_id) {
      return NextResponse.json({ error: "This brewery does not have a Stripe subscription to manage." }, { status: 409 });
    }
    const session = await getStripeClient().billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: `${getBillingBaseUrl()}/business/manage`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Could not create brewery billing portal session", error);
    const unauthorized = error instanceof Error && error.message === "Authentication required";
    return NextResponse.json(
      { error: unauthorized ? error.message : "Could not open brewery billing management." },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
