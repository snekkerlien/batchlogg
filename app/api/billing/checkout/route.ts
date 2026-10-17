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

  const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "Premium checkout is not configured yet" },
      { status: 503 }
    );
  }

  try {
    const { data: profile, error: profileError } = await serviceRole
      .from("profiles")
      .select("account_tier, stripe_subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw new Error(`Could not load billing profile: ${profileError.message}`);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    if (
      profile.account_tier === "premium" &&
      ["active", "trialing", "past_due"].includes(profile.stripe_subscription_status ?? "")
    ) {
      return NextResponse.json({ error: "Premium is already active" }, { status: 409 });
    }

    const stripe = getStripeClient();
    const baseUrl = getBillingBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${baseUrl}/premium?checkout=success`,
      cancel_url: `${baseUrl}/premium?checkout=cancelled`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Could not create Stripe checkout session", error);
    return NextResponse.json(
      { error: "Could not start Premium checkout" },
      { status: 500 }
    );
  }
}
