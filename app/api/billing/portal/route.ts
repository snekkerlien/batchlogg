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
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Could not load billing profile", profileError);
    return NextResponse.json({ error: "Could not load billing profile" }, { status: 500 });
  }
  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "This account does not have a Stripe subscription to manage" },
      { status: 409 }
    );
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${getBillingBaseUrl()}/premium`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Could not create Stripe billing portal session", error);
    return NextResponse.json(
      { error: "Could not open billing management" },
      { status: 500 }
    );
  }
}
