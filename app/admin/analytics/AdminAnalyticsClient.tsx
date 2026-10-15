"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

interface Metrics {
  accounts: number;
  publicProfiles: number;
  signups30d: number;
  recipes: number;
  publicRecipes: number;
  batches: number;
  forumTopics: number;
  pendingReports: number;
  activityAnalytics: {
    activeContributors: {
      last24Hours: number;
      last7Days: number;
      last30Days: number;
    };
    last30Days: {
      batchesStarted: number;
      recipesCreated: number;
      publicRecipesCreated: number;
      brewingNotes: number;
      forumTopics: number;
      forumReplies: number;
      gravityReadings: number;
      batchVolumeLitres: number;
      recipeShareRate: number;
    };
    batchesByType: { label: string; count: number }[];
    recipesByType: { label: string; count: number }[];
    activeBatchStatus: { label: string; count: number }[];
    forumTopicsByCategory: { label: string; count: number }[];
    monthlyTrend: {
      month: string;
      signups: number;
      contributors: number;
      batches: number;
      recipes: number;
      brewingNotes: number;
      forumPosts: number;
      gravityReadings: number;
    }[];
  };
}

function BreakdownList({
  items,
  emptyLabel,
}: {
  items: { label: string; count: number }[];
  emptyLabel: string;
}) {
  const maxCount = Math.max(1, ...items.map((item) => item.count));
  if (items.length === 0) {
    return <p className="text-sm text-white/75">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map(({ label, count }) => (
        <li key={label}>
          <div className="mb-1 flex justify-between gap-4 text-sm">
            <span className="text-white/75">{label}</span>
            <span className="font-semibold tabular-nums">{count.toLocaleString()}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-black/70"
            role="meter"
            aria-label={`${label}: ${count}`}
            aria-valuemin={0}
            aria-valuemax={maxCount}
            aria-valuenow={count}
          >
            <div
              className="h-full rounded-full bg-green-300"
              style={{ width: `${Math.max(2, (count / maxCount) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
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

  const cards: [string, number][] = [
    ["Accounts", metrics?.accounts ?? 0],
    ["Public profiles", metrics?.publicProfiles ?? 0],
    ["Signups (30 days)", metrics?.signups30d ?? 0],
    ["All recipes", metrics?.recipes ?? 0],
    ["Public recipes", metrics?.publicRecipes ?? 0],
    ["Tracked batches", metrics?.batches ?? 0],
    ["Forum discussions", metrics?.forumTopics ?? 0],
    ["Open reports", metrics?.pendingReports ?? 0],
  ];
  const activityCards: [string, number][] = [
    ["Contributors · 24 hours", metrics?.activityAnalytics.activeContributors.last24Hours ?? 0],
    ["Contributors · 7 days", metrics?.activityAnalytics.activeContributors.last7Days ?? 0],
    ["Contributors · 30 days", metrics?.activityAnalytics.activeContributors.last30Days ?? 0],
    ["Batches started", metrics?.activityAnalytics.last30Days.batchesStarted ?? 0],
    ["Recipes created", metrics?.activityAnalytics.last30Days.recipesCreated ?? 0],
    ["Brewing notes logged", metrics?.activityAnalytics.last30Days.brewingNotes ?? 0],
    ["Gravity readings", metrics?.activityAnalytics.last30Days.gravityReadings ?? 0],
    ["Forum topics", metrics?.activityAnalytics.last30Days.forumTopics ?? 0],
    ["Forum replies", metrics?.activityAnalytics.last30Days.forumReplies ?? 0],
  ];
  const trend = metrics?.activityAnalytics.monthlyTrend ?? [];
  const maxMonthlyActivity = Math.max(
    1,
    ...trend.map((month) =>
      month.batches + month.recipes + month.brewingNotes +
      month.forumPosts + month.gravityReadings
    )
  );

  return (
    <main className="min-h-screen px-5 py-12 text-white">
      <div className="relative mx-auto mt-12 max-w-5xl rounded-xl border border-white/20 bg-zinc-950/95 p-6 pt-16 shadow-2xl backdrop-blur-xl sm:p-10">
        <Link href="/admin" className="absolute left-4 top-4 rounded border border-white/25 bg-black/70 px-3 py-2 text-sm text-white hover:bg-black">Back to admin</Link>
        <div className="absolute right-4 top-4"><MenuOverlay current="admin" /></div>
        <PageHeading title="Community analytics" subtitle="Audience, brewing activity, content sharing, and community engagement, shown as aggregate statistics." />
        {error && <p role="alert" className="mb-5 rounded border border-red-400/50 bg-red-950/80 p-3 text-red-100">{error}</p>}
        {loading ? (
          <p className="text-center text-white/80">Loading analytics…</p>
        ) : metrics && (
          <>
            <section aria-labelledby="audience-heading">
              <h2 id="audience-heading" className="mb-3 text-lg font-semibold">Audience and community</h2>
              <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {cards.map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/20 bg-black/75 p-5 text-center shadow-lg">
                    <dt className="text-sm text-white/80">{label}</dt>
                    <dd className="mt-2 text-3xl font-bold text-green-200">{value.toLocaleString()}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section aria-labelledby="activity-heading" className="mt-8">
              <h2 id="activity-heading" className="mb-1 text-lg font-semibold">Recorded activity · last 30 days</h2>
              <p className="mb-3 text-sm text-white/80">
                Contributors are members who created or logged content. These counts do not represent visits or page views.
              </p>
              <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {activityCards.map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/20 bg-black/75 p-5 text-center shadow-lg">
                    <dt className="text-sm text-white/80">{label}</dt>
                    <dd className="mt-2 text-3xl font-bold text-green-200">{value.toLocaleString()}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-sm text-white/75">
                A contributor is a member who created content or logged activity. Sign-ins and page views are not currently tracked.
              </p>
            </section>
            <section aria-labelledby="brewing-heading" className="mt-8">
              <h2 id="brewing-heading" className="mb-3 text-lg font-semibold">Brewing footprint</h2>
              <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/20 bg-black/75 p-5 text-center shadow-lg">
                  <p className="text-sm text-white/80">Currently fermenting</p>
                  <p className="mt-2 text-3xl font-bold text-green-200">
                    {(metrics?.activityAnalytics.activeBatchStatus ?? []).reduce((total, item) => total + item.count, 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-white/20 bg-black/75 p-5 text-center shadow-lg">
                  <p className="text-sm text-white/80">Batch volume started · 30 days</p>
                  <p className="mt-2 text-3xl font-bold text-green-200">
                    {(metrics?.activityAnalytics.last30Days.batchVolumeLitres ?? 0).toLocaleString()} L
                  </p>
                </div>
                <div className="rounded-xl border border-white/20 bg-black/75 p-5 text-center shadow-lg">
                  <p className="text-sm text-white/80">Recipes made public · 30 days</p>
                  <p className="mt-2 text-3xl font-bold text-green-200">
                    {(metrics?.activityAnalytics.last30Days.recipeShareRate ?? 0).toLocaleString()}%
                  </p>
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-white/20 bg-black/75 p-5 shadow-lg">
                  <h3 className="mb-4 font-semibold">Batches started by style · 30 days</h3>
                  <BreakdownList
                    items={metrics?.activityAnalytics.batchesByType ?? []}
                    emptyLabel="No batch activity in this period."
                  />
                </div>
                <div className="rounded-xl border border-white/20 bg-black/75 p-5 shadow-lg">
                  <h3 className="mb-4 font-semibold">Current fermentation stage</h3>
                  <BreakdownList
                    items={metrics?.activityAnalytics.activeBatchStatus ?? []}
                    emptyLabel="No batches are currently fermenting."
                  />
                </div>
                <div className="rounded-xl border border-white/20 bg-black/75 p-5 shadow-lg">
                  <h3 className="mb-4 font-semibold">Recipes created by style · 30 days</h3>
                  <BreakdownList
                    items={metrics?.activityAnalytics.recipesByType ?? []}
                    emptyLabel="No recipes created in this period."
                  />
                </div>
                <div className="rounded-xl border border-white/20 bg-black/75 p-5 shadow-lg">
                  <h3 className="mb-4 font-semibold">Forum topics by category · 30 days</h3>
                  <BreakdownList
                    items={metrics?.activityAnalytics.forumTopicsByCategory ?? []}
                    emptyLabel="No new forum topics in this period."
                  />
                </div>
              </div>
            </section>
            <section aria-labelledby="trend-heading" className="mt-8">
              <h2 id="trend-heading" className="mb-1 text-lg font-semibold">12-month growth and engagement</h2>
              <p className="mb-4 text-sm text-white/80">
                Monthly signups and recorded contributions. Contributions include batches, recipes, brewing notes, forum posts and gravity readings.
              </p>
              <div className="space-y-3 rounded-xl border border-white/20 bg-black/75 p-5 shadow-lg">
                {trend.map((month) => {
                  const activity =
                    month.batches + month.recipes + month.brewingNotes +
                    month.forumPosts + month.gravityReadings;
                  const monthLabel = new Date(`${month.month}-01T00:00:00Z`)
                    .toLocaleDateString("en", { month: "short", year: "2-digit", timeZone: "UTC" });
                  return (
                    <div key={month.month} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 text-xs sm:grid-cols-[5rem_minmax(0,1fr)_auto]">
                      <span className="text-white/85">{monthLabel}</span>
                      <div
                        className="h-3 overflow-hidden rounded-full bg-white/15"
                        role="meter"
                        aria-label={`${monthLabel}: ${activity} recorded contributions`}
                        aria-valuemin={0}
                        aria-valuemax={maxMonthlyActivity}
                        aria-valuenow={activity}
                      >
                        <div
                          className="h-full rounded-full bg-green-300"
                          style={{ width: `${activity === 0 ? 0 : Math.max(1, (activity / maxMonthlyActivity) * 100)}%` }}
                        />
                      </div>
                      <span className="w-32 text-right tabular-nums text-white/85">
                        {activity} actions · {month.signups} signups
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
        <p className="mt-6 rounded-lg border border-white/10 bg-black/60 p-3 text-sm text-white/75">Lifetime totals may include historical content. Recent activity uses rolling 30-day windows; the trend uses calendar months. No sign-in or page-view tracking is currently collected.</p>
      </div>
    </main>
  );
}
