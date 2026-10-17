"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  async function openBillingEndpoint(endpoint: "checkout" | "portal") {
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
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="relative mx-auto mt-12 max-w-3xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 backdrop-blur-md sm:p-10">
        <div className="absolute right-4 top-2 z-40 sm:top-4">
          <MenuOverlay current="premium" />
        </div>
        <PageHeading
          title="Batchlogg Premium"
          subtitle="More insight, planning, and control for your brewing."
        />
        {loading ? (
          <p className="text-center text-white/65">Loading your plan…</p>
        ) : profile ? (
          <div className="mb-6 rounded-xl border border-green-400/20 bg-green-500/10 p-4 text-center">
            <p className="text-sm text-white/60">Your current tier</p>
            <p className="mt-1 text-xl font-semibold text-green-200">
              {profile.account_tier === "premium" ? "Premium" : "Free"}
            </p>
          </div>
        ) : (
          <p className="mb-6 text-center text-white/75">
            <Link className="text-green-200 underline" href="/auth/signup">Create an account</Link>
            {" "}or{" "}
            <Link className="text-green-200 underline" href="/auth/login">log in</Link>
            {" "}to manage your plan.
          </p>
        )}

        <ul className="mb-8 grid gap-3 sm:grid-cols-2">
          {[
            "Shopping list and brew calendar",
            "Brewing insights and advanced batch analytics",
            "SG history and development charts",
            "Recipe version history and comparison",
            "Fermentation schedules and stage reminders",
            "Advanced brewing calculators",
            "Advanced water chemistry and carbonation tools",
            "Shared vessels with richer collaboration",
            "Turn below-threshold inventory into shopping-list restock plans",
            "Featured public recipe and profile customization",
            "Saved dashboards, recipe JSON/CSV, and calendar exports",
          ].map((feature) => (
            <li key={feature} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/80">
              {feature}
            </li>
          ))}
        </ul>

        {profile?.account_tier === "free" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void openBillingEndpoint("checkout")}
            className="mx-auto block rounded-lg border border-green-400/40 bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-600 disabled:opacity-50"
          >
            {busy ? "Opening checkout…" : "Upgrade to Premium"}
          </button>
        )}
        {profile?.account_tier === "premium" && profile.premium_grant_source === "stripe" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void openBillingEndpoint("portal")}
            className="mx-auto block rounded-lg border border-white/20 bg-white/10 px-5 py-3 font-semibold hover:bg-white/20 disabled:opacity-50"
          >
            {busy ? "Opening billing…" : "Manage subscription"}
          </button>
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
