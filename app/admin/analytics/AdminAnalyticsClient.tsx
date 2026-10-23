"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import { SponsorAnalyticsLinks } from "./SponsorAnalyticsLinks";
import { useUnits } from "@/app/components/Units";
import { formatQuantity } from "@/lib/units";

interface Metrics {
  accounts: number;
  publicProfiles: number;
  signups30d: number;
  recipes: number;
  publicRecipes: number;
  batches: number;
  forumTopics: number;
  pendingReports: number;
  trafficAnalytics: {
    last30Days: {
      pageViews: number;
      signIns: number;
    };
    topPages: { route: string; views: number }[];
  };
  userLifecycleAnalytics?: {
    firstBatchCohorts: {
      month: string;
      signups: number;
      firstBatchUsers: number;
      secondBatchUsers?: number;
      conversionRatePercent: number;
    }[];
    timeToFirstBatch: {
      convertedUsers: number;
      medianDays: number | null;
      eligibleSignupsWithin7Days: number;
      convertedWithin7Days: number;
      conversionWithin7DaysPercent: number;
    };
    acquisitionSources: {
      source: string;
      signups: number;
      firstBatchUsers: number;
      secondBatchUsers: number;
      firstBatchRatePercent: number;
      secondBatchRatePercent: number;
    }[];
    retentionAfterFirstBatch: {
      days: number;
      eligibleUsers: number;
      returnedUsers: number;
      returnRatePercent: number;
    }[];
    batchProgress: {
      totalBatches: number;
      stages: { stage: string; count: number; percent: number }[];
    };
    featureUsage: {
      feature: string;
      adoptedUsers: number;
      eligibleUsers: number;
      returnedUsers: number;
      returnRatePercent: number;
    }[];
    retention: {
      inactivityThresholdDays: number;
      matureTrackedUsers: number;
      churnedUsers: number;
      churnRatePercent: number;
      averageDaysBeforeChurn: number | null;
    };
  };
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
    activeBatchVolumeLitres: number;
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

export function AdminAnalyticsClient({ sponsorToken }: { sponsorToken?: string } = {}) {
  const { system } = useUnits();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const endpoint = sponsorToken
      ? `/api/sponsor/analytics/${encodeURIComponent(sponsorToken)}`
      : "/api/admin/analytics";
    fetch(endpoint, { cache: "no-store", credentials: "include" })
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
  }, [sponsorToken]);

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
  const trafficCards: [string, number][] = [
    ["Page views · 30 days", metrics?.trafficAnalytics.last30Days.pageViews ?? 0],
    ["Sign-ins · 30 days", metrics?.trafficAnalytics.last30Days.signIns ?? 0],
  ];
  const lifecycle = metrics?.userLifecycleAnalytics;
  const lifecycleCards: [string, string][] = [
    ["New accounts · eligible cohorts", (lifecycle?.firstBatchCohorts.reduce((sum, cohort) => sum + cohort.signups, 0) ?? 0).toLocaleString()],
    ["Created a first batch", (lifecycle?.firstBatchCohorts.reduce((sum, cohort) => sum + cohort.firstBatchUsers, 0) ?? 0).toLocaleString()],
    ["Mature users tracked", (lifecycle?.retention.matureTrackedUsers ?? 0).toLocaleString()],
    [`Inactive ${lifecycle?.retention.inactivityThresholdDays ?? 30}+ days`, (lifecycle?.retention.churnedUsers ?? 0).toLocaleString()],
    ["Inactive-user rate", `${lifecycle?.retention.churnRatePercent ?? 0}%`],
    ["Avg. days to last activity", lifecycle?.retention.averageDaysBeforeChurn == null
      ? "—"
      : lifecycle.retention.averageDaysBeforeChurn.toLocaleString()],
  ];
  const signupCohorts = (lifecycle?.firstBatchCohorts ?? []).filter(
    (cohort) => cohort.signups > 0
  );
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
        {!sponsorToken && (
          <>
            <Link href="/admin" className="absolute left-4 top-4 rounded border border-white/25 bg-black/70 px-3 py-2 text-sm text-white hover:bg-black">Back to admin</Link>
            <div className="absolute right-4 top-4"><MenuOverlay current="admin" /></div>
          </>
        )}
        <PageHeading
          title="Community analytics"
          subtitle="Audience, brewing activity, content sharing, and community engagement, shown as aggregate statistics."
        />
        {!sponsorToken && <SponsorAnalyticsLinks />}
        {error && <p role="alert" className="mb-5 rounded border border-red-400/50 bg-red-950/80 p-3 text-red-100">{error}</p>}
        {loading ? (
          <p className="text-center text-white/80">Loading analytics…</p>
        ) : metrics && (
          <>
            <section aria-labelledby="audience-heading">
              <h2 id="audience-heading" className="mb-3 text-lg font-semibold">Audience and community</h2>
              <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {cards.map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/20 bg-black/75 p-4 text-center shadow-lg">
                    <dt className="text-sm text-white/80">{label}</dt>
                    <dd className="mt-1 text-2xl font-bold text-green-200">{value.toLocaleString()}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section aria-labelledby="traffic-heading" className="mt-8">
              <h2 id="traffic-heading" className="mb-1 text-lg font-semibold">Site traffic · last 30 days</h2>
              <p className="mb-3 text-sm text-white/80">
                Page views are grouped by top-level section only; full URLs and individual page paths are not stored.
              </p>
              <dl className="mb-5 grid grid-cols-2 gap-3">
                {trafficCards.map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/20 bg-black/75 p-4 text-center shadow-lg">
                    <dt className="text-sm text-white/80">{label}</dt>
                    <dd className="mt-1 text-2xl font-bold text-green-200">{value.toLocaleString()}</dd>
                  </div>
                ))}
              </dl>
              <ul aria-label="Most viewed sections" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(metrics?.trafficAnalytics.topPages ?? []).map(({ route, views }) => (
                  <li
                    key={route}
                    className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-white/75">{route || "Homepage"}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-green-200">
                      {views.toLocaleString()}
                    </span>
                  </li>
                ))}
                {(metrics?.trafficAnalytics.topPages ?? []).length === 0 && (
                  <li className="col-span-full text-sm text-white/65">
                    No page-view data has been collected yet.
                  </li>
                )}
              </ul>
            </section>
            {!sponsorToken && lifecycle && <section aria-labelledby="lifecycle-heading" className="mt-8">
              <h2 id="lifecycle-heading" className="mb-1 text-lg font-semibold">Signup conversion and retention</h2>
              <p className="mb-3 text-sm text-white/80">
                First-batch conversion uses signup cohorts from the last 12 months and counts users whose first recorded batch was created after signup. Retention treats a user as inactive after 30 days without a tracked sign-in or page view; it is an inactivity estimate, not account cancellation.
              </p>
              <dl className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                {lifecycleCards.map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/20 bg-black/75 p-4 text-center shadow-lg">
                    <dt className="text-sm text-white/80">{label}</dt>
                    <dd className="mt-1 text-2xl font-bold text-green-200">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mb-3 text-sm text-white/70">
                Retention only includes mature accounts with recorded activity. Months without signups are omitted below. A second batch means at least two batches created after signup.
              </p>
              <div className="overflow-x-auto rounded-xl border border-white/20 bg-black/75">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead className="border-b border-white/15 text-white/70">
                    <tr>
                      <th scope="col" className="px-3 py-2.5">Signup month</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Signups</th>
                      <th scope="col" className="px-3 py-2.5 text-right">First batch</th>
                      <th scope="col" className="px-3 py-2.5 text-right">Second batch</th>
                      <th scope="col" className="w-40 px-3 py-2.5">Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signupCohorts.map((cohort) => (
                      <tr key={cohort.month} className="border-b border-white/10 last:border-0">
                        <th scope="row" className="px-3 py-2.5 font-medium text-white/85">
                          {new Date(`${cohort.month}-01T00:00:00Z`).toLocaleDateString("en", {
                            month: "short",
                            year: "numeric",
                            timeZone: "UTC",
                          })}
                        </th>
                        <td className="px-3 py-2.5 text-right tabular-nums">{cohort.signups.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{cohort.firstBatchUsers.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {(cohort.secondBatchUsers ?? 0).toLocaleString()}
                          <span className="ml-1 text-white/55">
                            ({cohort.signups
                              ? Math.round(((cohort.secondBatchUsers ?? 0) / cohort.signups) * 100)
                              : 0}%)
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-white/15"
                              role="meter"
                              aria-label={`${cohort.month} first-batch conversion`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={cohort.conversionRatePercent}
                            >
                              <div
                                className="h-full rounded-full bg-green-300"
                                style={{ width: `${cohort.conversionRatePercent}%` }}
                              />
                            </div>
                            <span className="w-10 text-right tabular-nums">
                              {cohort.conversionRatePercent}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {signupCohorts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-white/65">
                          No signups in the last 12 months.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <section aria-labelledby="first-batch-time-heading" className="rounded-xl border border-white/15 bg-black/60 p-4">
                  <h3 id="first-batch-time-heading" className="mb-1 font-semibold">Time to first batch</h3>
                  <p className="mb-3 text-xs text-white/65">
                    Median is among users who started a batch. Seven-day conversion excludes signups less than a week old.
                  </p>
                  <dl className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <dt className="text-xs text-white/70">Median days · {lifecycle.timeToFirstBatch.convertedUsers} users</dt>
                      <dd className="mt-1 text-xl font-bold text-green-200">
                        {lifecycle.timeToFirstBatch.medianDays ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-white/70">
                        First batch within 7 days · {lifecycle.timeToFirstBatch.eligibleSignupsWithin7Days} eligible
                      </dt>
                      <dd className="mt-1 text-xl font-bold text-green-200">
                        {lifecycle.timeToFirstBatch.conversionWithin7DaysPercent}%
                      </dd>
                    </div>
                  </dl>
                </section>
                <section aria-labelledby="first-batch-retention-heading" className="rounded-xl border border-white/15 bg-black/60 p-4">
                  <h3 id="first-batch-retention-heading" className="mb-1 font-semibold">Return after first batch</h3>
                  <p className="mb-3 text-xs text-white/65">
                    At least one recorded batch, recipe, inventory item, brew note, or gravity log after the first day.
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {lifecycle.retentionAfterFirstBatch.map((window) => (
                      <div key={window.days} className="rounded-lg bg-white/5 p-2">
                        <div className="text-xs text-white/70">{window.days} days</div>
                        <div className="mt-1 font-bold text-green-200">{window.returnRatePercent}%</div>
                        <div className="text-xs text-white/60">
                          {window.returnedUsers}/{window.eligibleUsers}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <section aria-labelledby="acquisition-heading" className="rounded-xl border border-white/15 bg-black/60 p-4">
                  <h3 id="acquisition-heading" className="mb-1 font-semibold">Signup source quality</h3>
                  <p className="mb-3 text-xs text-white/65">
                    Broad source categories only; older accounts without attribution are shown as unattributed.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-white/65">
                        <tr>
                          <th scope="col" className="py-1 text-left font-medium">Source</th>
                          <th scope="col" className="py-1 text-right font-medium">Signups</th>
                          <th scope="col" className="py-1 text-right font-medium">First batch</th>
                          <th scope="col" className="py-1 text-right font-medium">Second batch</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lifecycle.acquisitionSources.map((source) => (
                          <tr key={source.source} className="border-t border-white/10">
                            <th scope="row" className="py-1.5 text-left font-medium capitalize">{source.source}</th>
                            <td className="py-1.5 text-right tabular-nums">{source.signups}</td>
                            <td className="py-1.5 text-right tabular-nums">
                              {source.firstBatchUsers} ({source.firstBatchRatePercent}%)
                            </td>
                            <td className="py-1.5 text-right tabular-nums">
                              {source.secondBatchUsers} ({source.secondBatchRatePercent}%)
                            </td>
                          </tr>
                        ))}
                        {lifecycle.acquisitionSources.length === 0 && (
                          <tr><td colSpan={4} className="py-3 text-center text-white/60">No signup data.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section aria-labelledby="batch-progress-heading" className="rounded-xl border border-white/15 bg-black/60 p-4">
                  <h3 id="batch-progress-heading" className="mb-1 font-semibold">Batch progress · 12 months</h3>
                  <p className="mb-3 text-xs text-white/65">
                    Current status of batches started in this period; this is not a stage-transition funnel.
                  </p>
                  <ul className="space-y-2">
                    {lifecycle.batchProgress.stages.map(({ stage, count, percent }) => (
                      <li key={stage}>
                        <div className="mb-1 flex justify-between gap-3 text-sm">
                          <span className="text-white/75">{stage}</span>
                          <span className="tabular-nums">{count} · {percent}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-green-300" style={{ width: `${percent}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
                <section aria-labelledby="feature-usage-heading" className="rounded-xl border border-white/15 bg-black/60 p-4 md:col-span-2">
                  <h3 id="feature-usage-heading" className="mb-1 font-semibold">Feature adoption and return</h3>
                  <p className="mb-3 text-xs text-white/65">
                    Adoption uses saved records. Return means another recorded action 1–30 days after first using that feature; only users with a complete 30-day window count in the rate.
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {lifecycle.featureUsage.map((feature) => (
                      <div key={feature.feature} className="rounded-lg bg-white/5 p-3">
                        <div className="font-medium">{feature.feature}</div>
                        <div className="mt-1 text-sm text-white/75">
                          Adopted {feature.adoptedUsers} · returned {feature.returnedUsers}/{feature.eligibleUsers} eligible
                        </div>
                        <div className="text-lg font-bold text-green-200">{feature.returnRatePercent}% return</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </section>}
            <section aria-labelledby="activity-heading" className="mt-8">
              <h2 id="activity-heading" className="mb-1 text-lg font-semibold">Recorded activity · last 30 days</h2>
              <p className="mb-3 text-sm text-white/80">
                Contributors are members who created or logged content; traffic is reported separately above.
              </p>
              <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {activityCards.map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/20 bg-black/75 p-4 text-center shadow-lg">
                    <dt className="text-sm text-white/80">{label}</dt>
                    <dd className="mt-1 text-2xl font-bold text-green-200">{value.toLocaleString()}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-sm text-white/75">
                A contributor is a member who created content or logged activity. Sign-ins count successful authenticated sessions.
              </p>
            </section>
            <section aria-labelledby="brewing-heading" className="mt-8">
              <h2 id="brewing-heading" className="mb-1 text-lg font-semibold">Brewing footprint</h2>
              <p className="mb-3 text-sm text-white/70">Current brewing totals and 30-day trends.</p>
              <div className="mb-5 rounded-xl border border-white/20 bg-black/75 p-6 text-center shadow-lg sm:p-8">
                <p className="text-sm text-white/80">
                  {system === "imperial" ? "Gallons currently logged" : "Liters currently logged"}
                </p>
                <p className="mt-3 break-words text-5xl font-bold leading-tight tabular-nums text-green-200 sm:text-6xl">
                  {formatQuantity(
                    "volume",
                    metrics?.activityAnalytics.activeBatchVolumeLitres,
                    system,
                    1
                  ) ?? `0 ${system === "imperial" ? "gal" : "L"}`}
                </p>
                <p className="mt-3 text-sm text-white/60">
                  Total volume in active fermentation across all users
                </p>
              </div>
              <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/20 bg-black/75 p-4 text-center shadow-lg">
                  <p className="text-sm text-white/80">Currently fermenting</p>
                  <p className="mt-1 text-2xl font-bold text-green-200">
                    {(metrics?.activityAnalytics.activeBatchStatus ?? []).reduce((total, item) => total + item.count, 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-white/20 bg-black/75 p-4 text-center shadow-lg">
                  <p className="text-sm text-white/80">Batch volume started · 30 days</p>
                  <p className="mt-1 text-2xl font-bold text-green-200">
                    {formatQuantity(
                      "volume",
                      metrics?.activityAnalytics.last30Days.batchVolumeLitres,
                      system,
                      1
                    ) ?? `0 ${system === "imperial" ? "gal" : "L"}`}
                  </p>
                </div>
                <div className="rounded-xl border border-white/20 bg-black/75 p-4 text-center shadow-lg">
                  <p className="text-sm text-white/80">Recipes made public · 30 days</p>
                  <p className="mt-1 text-2xl font-bold text-green-200">
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
        <p className="mt-6 rounded-lg border border-white/10 bg-black/60 p-3 text-sm text-white/75">Lifetime totals may include historical content. Recent activity uses rolling 30-day windows; the trend uses calendar months. Traffic analytics contain daily aggregate counts grouped by top-level route without account identifiers, IP addresses, or full URLs.</p>
      </div>
    </main>
  );
}
