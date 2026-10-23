"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

type BillingProfile = {
  account_tier: "free" | "premium";
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
      <div className="relative mx-auto mt-12 max-w-3xl rounded-xl border border-white/10 bg-black/60 p-3 pt-16 backdrop-blur-md sm:p-10">
        <div className="absolute left-4 top-2 z-40 sm:top-4">
          <BackButton />
        </div>
        <div className="absolute right-4 top-2 z-40 sm:top-4">
          <MenuOverlay current="premium" />
        </div>
        <PageHeading
          title="Batchlogg Premium"
          subtitle="More insight, planning, and control for your brewing."
        />
        {profile ? (
          <div className="mb-6 rounded-xl border border-green-400/20 bg-green-500/10 p-4 text-center">
            <p className="text-sm text-white/60">Your current tier</p>
            <p className="mt-1 text-xl font-semibold text-green-200">
              {profile.account_tier === "premium" ? "Premium" : "Free"}
            </p>
          </div>
        ) : !loading ? (
          <p className="mb-6 text-center text-white/75">
            <Link className="text-green-200 underline" href="/auth/signup">Create an account</Link>
            {" "}or{" "}
            <Link className="text-green-200 underline" href="/auth/login">log in</Link>
            {" "}to manage your plan.
          </p>
        ) : null}

        {profile?.account_tier !== "premium" && (
          <div className="mb-8 flex flex-col items-center gap-3">
            <p className="text-center text-white/80">
              Premium is $4.99 USD per month, before VAT.
            </p>
            <p className="max-w-md text-center text-sm text-white/60">
              Batchlogg is an independent, community-driven project that’s
              still growing. Active users have a real say in what we build
              next—community feedback helps shape our priorities and improve
              the brewing tools. Your subscription supports that ongoing work.
            </p>
            <p className="max-w-md text-center text-sm text-white/60">
              Applicable VAT will be calculated and added during checkout based on your billing address. The final total will be shown before payment.
            </p>
            {profile?.account_tier === "free" && !loading && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void openBillingEndpoint("checkout")}
                className="rounded-lg border border-green-400/40 bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-600 disabled:opacity-50"
              >
                {busy ? "Opening checkout…" : "Upgrade to Premium"}
              </button>
            )}
          </div>
        )}

        <section aria-labelledby="premium-features-heading" className="mb-8">
          <h2
            id="premium-features-heading"
            className="mb-4 text-center text-lg font-semibold text-green-200"
          >
            What Premium unlocks
          </h2>
          <div className="space-y-4">
            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="font-semibold text-white">More brewing capacity</h3>
              <ul className="mt-2 list-outside list-disc space-y-1 pl-5 text-sm text-white/75">
                <li>Track up to 20 vessels instead of the Free plan’s 6.</li>
              </ul>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="font-semibold text-white">Plan and track your brewing</h3>
              <ul className="mt-2 list-outside list-disc space-y-1 pl-5 text-sm text-white/75">
                <li>
                  Use the brew calendar to see batch dates and scheduled
                  reminders, and export them to calendar apps with iCalendar.
                </li>
                <li>
                  Create and manage a shopping list, and plan restocks from
                  low-stock inventory.
                </li>
                <li>
                  View a batch’s specific-gravity development graph and current
                  ABV. All plans can save and review gravity readings.
                </li>
                <li>
                  Invite collaborators to shared vessels and review their
                  activity history.
                </li>
              </ul>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="font-semibold text-white">Learn from your batches</h3>
              <ul className="mt-2 list-outside list-disc space-y-1 pl-5 text-sm text-white/75">
                <li>
                  Review brewing insights and analytics from your batch
                  history.
                </li>
              </ul>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="font-semibold text-white">Keep and export recipe history</h3>
              <ul className="mt-2 list-outside list-disc space-y-1 pl-5 text-sm text-white/75">
                <li>
                  Save recipe snapshots as you edit recipes, then view and
                  compare earlier versions.
                </li>
                <li>
                  Export recipes as JSON or CSV; export BeerXML for beer and
                  braggot recipes, or BeerJSON.
                </li>
              </ul>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="font-semibold text-white">Showcase a recipe</h3>
              <ul className="mt-2 list-outside list-disc space-y-1 pl-5 text-sm text-white/75">
                <li>
                  Feature one of your public recipes on your profile. The
                  profile banner is available on Free too.
                </li>
              </ul>
            </section>
          </div>
        </section>

        {profile?.account_tier === "premium" && profile.premium_grant_source === "stripe" && (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void openBillingEndpoint("portal")}
              className="rounded-lg border border-white/20 bg-white/10 px-5 py-3 font-semibold hover:bg-white/20 disabled:opacity-50"
            >
              {busy ? "Opening billing…" : "Manage subscription"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void openBillingEndpoint("cancel")}
              className="rounded-lg border border-red-400/40 bg-red-950/40 px-5 py-3 font-semibold text-red-100 hover:bg-red-900/50 disabled:opacity-50"
            >
              {busy ? "Opening cancellation…" : "Cancel subscription"}
            </button>
            <p className="max-w-md text-center text-sm text-white/60">
              You’ll review and confirm cancellation securely with Stripe. Your Premium
              access will continue through the current billing period.
            </p>
          </div>
        )}
        {profile?.account_tier === "premium" && profile.premium_grant_source !== "stripe" && (
          <p className="text-center text-sm text-white/60">
            Premium access is currently granted to your account.
          </p>
        )}
        {message && <p role="status" className="mt-4 text-center text-sm text-amber-200">{message}</p>}
      </div>
    </main>
  );
}
