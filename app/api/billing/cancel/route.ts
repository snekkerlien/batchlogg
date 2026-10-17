import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getBillingBaseUrl, getStripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await serviceRole
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Could not load billing profile", profileError);
    return NextResponse.json({ error: "Could not load billing profile" }, { status: 500 });
  }
  if (!profile?.stripe_customer_id || !profile.stripe_subscription_id) {
    return NextResponse.json(
      { error: "This account does not have a Stripe subscription to cancel" },
      { status: 409 }
    );
  }

  try {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const subscriptionCustomerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    if (subscriptionCustomerId !== profile.stripe_customer_id) {
      console.error("Stripe subscription does not match the billing profile", {
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Could not verify the subscription for this account" },
        { status: 409 }
      );
    }
    if (!["active", "trialing", "past_due"].includes(subscription.status)) {
      return NextResponse.json(
        { error: "There is no active subscription to cancel" },
        { status: 409 }
      );
    }

    const baseUrl = getBillingBaseUrl();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${baseUrl}/premium`,
      ...(subscription.cancel_at_period_end
        ? {}
        : {
            flow_data: {
              type: "subscription_cancel" as const,
              subscription_cancel: { subscription: subscription.id },
              after_completion: {
                type: "redirect" as const,
                redirect: { return_url: `${baseUrl}/premium?subscription=cancelled` },
              },
            },
          }),
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Could not create Stripe cancellation session", error);
    return NextResponse.json(
      { error: "Could not open the cancellation page" },
      { status: 500 }
    );
  }
}
