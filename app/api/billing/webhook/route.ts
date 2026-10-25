import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/billing/stripe";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMaxVessels } from "@/lib/vessels/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function syncSubscription(
  stripe: Stripe,
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"],
  subscription: Stripe.Subscription
) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const userId = subscription.metadata.user_id;

  let query = serviceRole
    .from("profiles")
    .select("id, account_tier, premium_grant_source, membership_status")
    .limit(1);
  query = userId
    ? query.eq("id", userId)
    : query.eq("stripe_customer_id", customerId);
  const { data: profiles, error: profileError } = await query;
  if (profileError) throw new Error(`Could not find subscription owner: ${profileError.message}`);
  const profile = profiles?.[0];
  if (!profile) {
    throw new Error(`No Batchlogg profile is linked to Stripe customer ${customerId}`);
  }

  const active = ["active", "trialing", "past_due"].includes(subscription.status);
  const currentPeriodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number");
  let accountTier = profile.account_tier;
  const update: Record<string, string | number | null> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_current_period_end: currentPeriodEnds.length
      ? new Date(Math.max(...currentPeriodEnds) * 1000).toISOString()
      : null,
  };

  if (profile.premium_grant_source === "stripe" || !profile.premium_grant_source) {
    accountTier = active ? "premium" : "free";
    update.account_tier = accountTier;
    update.premium_grant_source = active ? "stripe" : null;
  }
  update.max_vessels = getMaxVessels(accountTier, profile.membership_status);

  const { error: updateError } = await serviceRole
    .from("profiles")
    .update(update)
    .eq("id", profile.id);
  if (updateError) {
    throw new Error(`Could not sync Stripe subscription: ${updateError.message}`);
  }
}

async function syncBrewerySubscription(
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"],
  subscription: Stripe.Subscription
) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const breweryId = subscription.metadata.brewery_id;
  if (!breweryId) throw new Error("Brewery subscription is missing its brewery ID");

  const periodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number");
  const { error } = await serviceRole
    .from("brewery_accounts")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_subscription_status: subscription.status,
      stripe_current_period_end: periodEnds.length
        ? new Date(Math.max(...periodEnds) * 1000).toISOString()
        : null,
    })
    .eq("id", breweryId);
  if (error) throw new Error(`Could not sync brewery subscription: ${error.message}`);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  const { serviceRole } = supabaseServer();
  const { data: processedEvent, error: lookupError } = await serviceRole
    .from("stripe_webhook_events")
    .select("event_id")
    .eq("event_id", event.id)
    .maybeSingle();
  if (lookupError) {
    console.error("Could not check Stripe webhook idempotency", lookupError);
    return NextResponse.json({ error: "Could not process Stripe event" }, { status: 500 });
  }
  if (processedEvent) return NextResponse.json({ received: true });

  try {
    if (event.type.startsWith("customer.subscription.")) {
      const subscription = event.data.object as Stripe.Subscription;
      if (subscription.metadata.brewery_id) {
        await syncBrewerySubscription(serviceRole, subscription);
      } else {
        await syncSubscription(getStripeClient(), serviceRole, subscription);
      }
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
        if (subscription.metadata.brewery_id) {
          await syncBrewerySubscription(serviceRole, subscription);
        } else {
          await syncSubscription(getStripeClient(), serviceRole, subscription);
        }
      }
    }

    const { error: insertError } = await serviceRole
      .from("stripe_webhook_events")
      .insert({ event_id: event.id });
    if (insertError && insertError.code !== "23505") {
      throw new Error(`Could not mark Stripe event processed: ${insertError.message}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Could not process Stripe event ${event.id}`, error);
    return NextResponse.json({ error: "Could not process Stripe event" }, { status: 500 });
  }
}
