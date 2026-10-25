"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import { FREE_RECIPE_LIMIT } from "@/lib/recipes/constants";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

type BillingProfile = {
  account_tier: "free" | "premium";
  has_premium_access: boolean;
  membership_status: string;
  premium_grant_source: string | null;
  stripe_subscription_status: string | null;
};

export default function PremiumPage() {
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadPlan() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();
      if (!session) {
        if (active) setLoading(false);
        return;
      }
      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Could not load your membership plan");
      }
      const data = await response.json();
      if (active) {
        setProfile({
          account_tier: data.account_tier === "premium" ? "premium" : "free",
          has_premium_access: data.has_premium_access === true,
          membership_status: data.membership_status ?? "member",
          premium_grant_source: data.premium_grant_source ?? null,
          stripe_subscription_status: data.stripe_subscription_status ?? null,
        });
      }
    }
    loadPlan()
      .catch((error) => {
        console.error("Could not load membership plan", error);
        if (active) setMessage("Could not load your membership plan. Please reload.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function openBillingEndpoint(endpoint: "checkout" | "portal" | "cancel") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/billing/${endpoint}`, {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open billing");
      window.location.assign(result.url);
    } catch (error) {
      console.error(`Could not open billing ${endpoint}`, error);
      setMessage(error instanceof Error ? error.message : "Could not open billing");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-2 py-12 text-white sm:px-6">
      <div className="relative mx-auto mt-12 max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/85 p-3 pt-16 shadow-2xl backdrop-blur-md sm:p-8 sm:pt-16">
        <div className="absolute left-4 top-2 z-40 sm:top-4">
          <BackButton />
        </div>
        <div className="absolute right-4 top-2 z-40 sm:top-4">
          <MenuOverlay current="premium" />
        </div>
        <section
          className="relative isolate overflow-hidden rounded-2xl border border-green-300/20 px-5 py-10 shadow-inner shadow-white/5 sm:px-10 sm:py-14"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--user-accent) 22%, #09090b) 0%, color-mix(in srgb, var(--user-accent) 10%, #09090b) 52%, #09090b 100%)",
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                "linear-gradient(115deg, rgb(255 255 255 / 10%) 0%, rgb(255 255 255 / 3%) 18%, transparent 38%, rgb(0 0 0 / 14%) 100%)",
            }}
          />
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 z-0 h-72 w-72 rounded-full bg-green-400/[0.04] blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 z-0 h-64 w-64 rounded-full bg-green-400/[0.02] blur-3xl" />
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-200/20 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-green-100/80">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green-300 shadow-[0_0_12px_rgba(134,239,172,0.9)]" />
              Brew more. Keep learning.
            </p>
            <PageHeading
              title="Make every batch count."
              subtitle="More room to brew, clearer insights, and better tools for planning what comes next."
            />
            {profile ? (
              <>
                <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/70">
                  <span>Your current plan</span>
                  <span className="font-semibold text-green-100">
                    {profile.has_premium_access ? "Premium access" : "Free"}
                  </span>
                </div>
                {profile.has_premium_access &&
                  (profile.premium_grant_source === "manual" ||
                    profile.account_tier !== "premium") && (
                    <p className="mx-auto mt-2 max-w-xl text-sm text-white/65">
                      {profile.premium_grant_source === "manual" ||
                      ["sponsor", "partner", "founder"].includes(profile.membership_status)
                        ? "Your Premium access has been sponsored by Batchlogg!"
                        : ["admin", "moderator"].includes(profile.membership_status)
                        ? `You’ve been granted Premium access because you’re a ${profile.membership_status}.`
                        : "Your Premium access has been granted to your account."}
                    </p>
                  )}
              </>
            ) : !loading ? (
              <p className="mx-auto mt-5 text-sm text-white/70">
                <Link className="font-semibold text-green-200 underline underline-offset-4" href="/auth/signup">Create an account</Link>
                {" "}or{" "}
                <Link className="font-semibold text-green-200 underline underline-offset-4" href="/auth/login">log in</Link>
                {" "}to manage your plan.
              </p>
            ) : null}
          </div>

          {profile?.has_premium_access !== true && (
            <div className="relative z-10 mx-auto mt-8 grid max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black/55 shadow-xl shadow-black/20 backdrop-blur-md md:grid-cols-[1fr_auto]">
              <div className="p-5 sm:p-7">
                <p className="text-sm font-medium text-green-100/70">Premium membership</p>
                <p className="mt-1 text-4xl font-bold tracking-tight text-white">
                  $4.99 <span className="text-base font-medium text-white/60">USD / month</span>
                </p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
                  Support an independent, community-driven project. Member feedback helps shape what we build next.
                </p>
                <p className="mt-3 text-xs leading-5 text-white/50">
                  Before applicable VAT. VAT is calculated from your billing address, and the final total is shown before payment.
                </p>
              </div>
              <div className="flex items-center justify-center border-t border-white/10 p-5 md:border-l md:border-t-0 md:px-7">
                {profile && !profile.has_premium_access && !loading ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void openBillingEndpoint("checkout")}
                    className="min-h-12 w-full rounded-xl border border-green-200/30 bg-green-500 px-6 py-3 font-bold text-zinc-950 shadow-lg shadow-green-950/30 transition hover:bg-green-400 disabled:cursor-wait disabled:opacity-50 md:w-auto"
                  >
                    {busy ? "Opening checkout…" : "Upgrade to Premium"}
                  </button>
                ) : !profile && !loading ? (
                  <Link
                    href="/auth/signup"
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-green-200/30 bg-green-500 px-6 py-3 font-bold text-zinc-950 shadow-lg shadow-green-950/30 transition hover:bg-green-400"
                  >
                    Get started
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="premium-features-heading" className="py-10 sm:py-12">
          <div className="mb-6 flex flex-col gap-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-200/70">Built for your next brew day</p>
            <h2 id="premium-features-heading" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              What Premium unlocks
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-6 text-white/60">
              Spend less time working around limits and more time making better batches.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="premium-feature-card rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 transition hover:border-green-300/25">
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-green-300/20 bg-green-300/10 text-sm font-bold text-green-200">01</span>
              <h3 className="text-lg font-semibold text-white">Room for more brewing</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Get space for up to 20 vessels, more than three times the Free limit of 6. Keep more batches moving without clearing a vessel just to make room for your next brew.
              </p>
            </section>
            <section className="premium-feature-card rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 transition hover:border-green-300/25">
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-300/20 bg-blue-300/10 text-sm font-bold text-blue-200">02</span>
              <h3 className="text-lg font-semibold text-white">Plan and track with confidence</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Plan with the full calendar and iCalendar export. Free includes the upcoming seven days. Get restock suggestions for low inventory, view gravity graphs and current ABV, and collaborate with shared vessels, notes, and activity history.
              </p>
            </section>
            <section className="premium-feature-card rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 transition hover:border-green-300/25">
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-sm font-bold text-amber-200">03</span>
              <h3 className="text-lg font-semibold text-white">Understand your brewing progress</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">
                See average ABV, attenuation, brew time, and packaged yield across batches. Compare outcomes with recipe targets, then explore monthly trends and totals by brew type to see how your process is changing.
              </p>
            </section>
            <section className="premium-feature-card rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 transition hover:border-green-300/25">
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-purple-300/20 bg-purple-300/10 text-sm font-bold text-purple-200">04</span>
              <h3 className="text-lg font-semibold text-white">Unlimited recipes, with history</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Save as many recipes as you need. Free includes up to {FREE_RECIPE_LIMIT}. Keep snapshots as recipes change and compare earlier versions. Export JSON or CSV, plus BeerXML for beer and braggot or BeerJSON for compatible brewing apps.
              </p>
            </section>
            <section className="premium-feature-card relative isolate overflow-hidden rounded-2xl border border-pink-300/20 bg-gradient-to-br from-pink-300/[0.08] via-white/[0.04] to-white/[0.02] p-5 transition hover:border-pink-300/40 sm:col-span-2 sm:flex sm:items-center sm:gap-8 sm:p-7">
              <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 -z-10 h-56 w-56 rounded-full bg-pink-300/[0.08] blur-3xl" />
              <div className="shrink-0">
                <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-pink-300/20 bg-pink-300/10 text-sm font-bold text-pink-200">05</span>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-200/70">Make it yours</p>
              </div>
              <div className="mt-4 sm:mt-0">
                <h3 className="text-lg font-semibold text-white">Put your recipe in the spotlight</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
                  Feature one of your public recipes on your profile, so visitors can find a brew you’re proud to share. The profile banner is available on Free too. Premium adds the featured recipe.
                </p>
              </div>
            </section>
          </div>
        </section>

        {profile?.account_tier === "premium" && profile.premium_grant_source === "stripe" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <button
              type="button"
              disabled={busy}
              onClick={() => void openBillingEndpoint("portal")}
              className="min-h-12 rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-semibold hover:bg-white/20 disabled:opacity-50"
            >
              {busy ? "Opening billing…" : "Manage subscription"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void openBillingEndpoint("cancel")}
              className="min-h-12 rounded-xl border border-red-400/40 bg-red-950/40 px-5 py-3 font-semibold text-red-100 hover:bg-red-900/50 disabled:opacity-50"
            >
              {busy ? "Opening cancellation…" : "Cancel subscription"}
            </button>
            <p className="max-w-md text-center text-sm text-white/60">
              You’ll review and confirm cancellation securely with Stripe. Your Premium
              access will continue through the current billing period.
            </p>
          </div>
        )}
        {message && <p role="alert" className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-center text-sm text-amber-100">{message}</p>}
      </div>
    </main>
  );
}
