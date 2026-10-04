"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

interface Metrics {
  accounts: number;
  publicProfiles: number;
  monthlySignups: number;
  recipes: number;
  publicRecipes: number;
  batches: number;
  forumTopics: number;
  pendingReports: number;
}

export function AdminAnalyticsClient() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/analytics", { cache: "no-store", credentials: "include" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load analytics");
        if (active) setMetrics(data.metrics);
      })
      .catch((loadError) => {
        console.error("Could not load admin analytics", loadError);
        if (active) setError("Analytics could not be loaded.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const cards: [string, keyof Metrics][] = [
    ["Accounts", "accounts"],
    ["Public profiles", "publicProfiles"],
    ["Signups this month", "monthlySignups"],
    ["Recipes", "recipes"],
    ["Public recipes", "publicRecipes"],
    ["Tracked batches", "batches"],
    ["Forum discussions", "forumTopics"],
    ["Open reports", "pendingReports"],
  ];

  return (
    <main className="min-h-screen px-5 py-12 text-white">
      <div className="relative mx-auto mt-12 max-w-5xl rounded-xl border border-white/10 bg-black/60 p-6 pt-16 sm:p-10">
        <Link href="/admin" className="absolute left-4 top-4 rounded border border-white/20 px-3 py-2 text-sm">Back to admin</Link>
        <div className="absolute right-4 top-4"><MenuOverlay current="admin" /></div>
        <PageHeading title="Community analytics" subtitle="Aggregate operational counts. No member-level activity is exposed here." />
        {error && <p role="alert" className="mb-5 rounded border border-red-400/40 p-3 text-red-200">{error}</p>}
        {loading ? (
          <p className="text-center text-white/60">Loading analytics…</p>
        ) : metrics && (
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {cards.map(([label, key]) => (
              <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-5 text-center">
                <dt className="text-xs text-white/55">{label}</dt>
                <dd className="mt-2 text-3xl font-bold text-green-200">{metrics[key].toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-6 text-xs text-white/40">Counts are live database totals and may include historical content.</p>
      </div>
    </main>
  );
}
