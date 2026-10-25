"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

type Period = "7d" | "30d" | "90d";
type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  category: string;
  is_published: boolean;
  pageViews: number;
  qrScans: number;
  outboundClicks: number;
  shopClickRate: number | null;
  averageRating: number | null;
  reviewCount: number;
  newReviews: number;
};
type AnalyticsData = {
  period: Period;
  periodDays: number;
  summary: {
    pageViews: number;
    qrScans: number;
    outboundClicks: number;
    shopClickRate: number | null;
    averageRating: number | null;
    reviewCount: number;
    newReviews: number;
    publishedProducts: number;
  };
  ratingDistribution: { rating: number; count: number }[];
  recentReviews: {
    productId: string;
    productName: string;
    rating: number;
    title: string;
    body: string;
    createdAt: string;
  }[];
  daily: { date: string; pageViews: number; qrScans: number; outboundClicks: number }[];
  products: ProductSummary[];
  businessSlug: string;
};

const periods: { value: Period; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-white/55">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-green-200">{value}</p>
      {detail && <p className="mt-1 text-xs text-white/45">{detail}</p>}
    </div>
  );
}

export default function BreweryAnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (selectedPeriod: Period) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/brewery/analytics/summary?period=${selectedPeriod}`, {
        cache: "no-store",
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load business analytics.");
      setData(result);
    } catch (loadError) {
      console.error("Could not load business analytics", loadError);
      setError(loadError instanceof Error ? loadError.message : "Could not load business analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
  }, [load, period]);

  const maxDailyViews = Math.max(1, ...(data?.daily.map((day) => day.pageViews + day.qrScans + day.outboundClicks) ?? []));
  const maxRatingCount = Math.max(1, ...(data?.ratingDistribution.map((entry) => entry.count) ?? []));

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="relative mx-auto mt-8 max-w-5xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-9 sm:pt-16">
        <div className="absolute left-4 top-3 z-40"><BackButton /></div>
        <div className="absolute right-4 top-3 z-40"><MenuOverlay current="brewery" /></div>
        <PageHeading title="Business analytics" subtitle="Understand how customers discover and rate your products." />

        <div className="mb-6 flex flex-wrap items-center justify-center gap-2" aria-label="Analytics date range">
          {periods.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={period === option.value}
              onClick={() => setPeriod(option.value)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${period === option.value ? "border-green-400/50 bg-green-700 text-white" : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-red-400/30 bg-red-950/40 p-4 text-center text-red-200">
            <p>{error}</p>
            <button type="button" onClick={() => void load(period)} className="mt-3 underline">Try again</button>
          </div>
        ) : loading && !data ? (
          <p className="text-center text-white/65">Loading business analytics…</p>
        ) : data ? (
          <div className="space-y-6">
            {loading && <p role="status" className="text-center text-sm text-white/50">Updating analytics…</p>}
            <section aria-label={`${data.periodDays}-day summary`} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard label="Product page visits" value={data.summary.pageViews.toLocaleString()} detail={`Last ${data.periodDays} days`} />
              <MetricCard label="QR scans" value={data.summary.qrScans.toLocaleString()} detail={`Last ${data.periodDays} days`} />
              <MetricCard label="Shop clicks" value={data.summary.outboundClicks.toLocaleString()} detail={`Last ${data.periodDays} days`} />
              <MetricCard label="Shop click rate" value={data.summary.shopClickRate == null ? "—" : `${data.summary.shopClickRate.toFixed(1)}%`} detail="Clicks divided by product page visits" />
              <MetricCard label="Published products" value={data.summary.publishedProducts} detail="Visible to customers" />
              <MetricCard label="Customer rating" value={data.summary.averageRating == null ? "—" : `${data.summary.averageRating.toFixed(1)} / 5`} detail={`${data.summary.reviewCount} published review${data.summary.reviewCount === 1 ? "" : "s"} overall`} />
              <MetricCard label="New reviews" value={data.summary.newReviews} detail={`Last ${data.periodDays} days`} />
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-semibold text-green-200">Product visits</h2>
              <p className="mt-1 text-sm text-white/55">Product page visits, owner QR scans, and clicks through to product pages. Counts are not deduplicated by visitor.</p>
              {data.daily.every((day) => day.pageViews + day.qrScans + day.outboundClicks === 0) ? (
                <p className="mt-5 text-sm text-white/55">No product visits have been recorded in this period yet.</p>
              ) : (
                <div className="mt-5 flex h-44 items-end gap-1 border-b border-white/10 pb-6">
                  {data.daily.map((day, index) => {
                    const total = day.pageViews + day.qrScans + day.outboundClicks;
                    const dateLabel = new Date(`${day.date}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
                    return (
                      <div key={day.date} className="relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${dateLabel}: ${day.pageViews} page visits, ${day.qrScans} QR scans, ${day.outboundClicks} shop clicks`}>
                        {total > 0 && (
                          <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-sm" style={{ height: `${Math.max(4, total / maxDailyViews * 100)}%` }}>
                            <div className="min-h-0 flex-1 bg-green-400/70" style={{ flexGrow: day.pageViews }} />
                            {day.qrScans > 0 && <div className="min-h-1 bg-amber-300/80" style={{ flexGrow: day.qrScans }} />}
                            {day.outboundClicks > 0 && <div className="min-h-1 bg-sky-300/80" style={{ flexGrow: day.outboundClicks }} />}
                          </div>
                        )}
                        {(index === 0 || index === data.daily.length - 1 || index % Math.ceil(data.daily.length / 6) === 0) && (
                          <span className="absolute top-full mt-2 -translate-x-1/2 whitespace-nowrap text-[10px] text-white/45">{dateLabel}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 flex gap-4 text-xs text-white/55">
                <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-green-400/70" />Product page visits</span>
                <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-300/80" />QR scans</span>
                <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-sky-300/80" />Shop clicks</span>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h2 className="text-lg font-semibold text-green-200">Customer ratings</h2>
                <p className="mt-1 text-sm text-white/55">Published ratings across all products.</p>
                <div className="mt-4 space-y-2">
                  {[...(data.ratingDistribution ?? [])].reverse().map((entry) => (
                    <div key={entry.rating} className="grid grid-cols-[3rem_1fr_2rem] items-center gap-3 text-sm">
                      <span className="text-white/70">{entry.rating} ★</span>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-amber-300" style={{ width: `${entry.count / maxRatingCount * 100}%` }} />
                      </div>
                      <span className="text-right text-white/55">{entry.count}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h2 className="text-lg font-semibold text-green-200">Popular products</h2>
                <p className="mt-1 text-sm text-white/55">Ranked by product page visits and QR scans in the selected period.</p>
                {data.products.length === 0 ? <p className="mt-4 text-sm text-white/55">Add a product to start seeing product analytics.</p> : (
                  <ol className="mt-4 space-y-3">
                    {data.products.slice(0, 5).map((product, index) => (
                      <li key={product.id} className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0">
                        <div className="min-w-0">
                          <p className="truncate font-medium"><span className="mr-2 text-white/40">{index + 1}.</span>{product.name}</p>
                          <p className="mt-1 text-xs text-white/50">
                            {product.averageRating == null ? "No ratings" : `★ ${product.averageRating.toFixed(1)}`} · {product.reviewCount} review{product.reviewCount === 1 ? "" : "s"}
                          </p>
                          <p className="mt-1 text-xs text-white/50">
                            {product.outboundClicks} shop click{product.outboundClicks === 1 ? "" : "s"} · {product.shopClickRate == null ? "No page visits" : `${product.shopClickRate.toFixed(1)}% click rate`}
                          </p>
                        </div>
                        <p className="shrink-0 text-right text-sm text-white/70">{(product.pageViews + product.qrScans).toLocaleString()} visits</p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>

            <section className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-semibold text-green-200">Recent customer feedback</h2>
              <p className="mt-1 text-sm text-white/55">The latest published product reviews.</p>
              {data.recentReviews.length === 0 ? <p className="mt-4 text-sm text-white/55">No customer reviews yet.</p> : (
                <ul className="mt-4 space-y-4">
                  {data.recentReviews.map((review) => (
                    <li key={`${review.productId}-${review.createdAt}`} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-medium">{review.productName}</p>
                        <p className="text-sm text-amber-200">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)} <span className="text-white/50">{review.rating}/5</span></p>
                      </div>
                      {review.title && <p className="mt-2 text-sm font-medium text-white/85">{review.title}</p>}
                      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-white/65">{review.body}</p>
                      <time dateTime={review.createdAt} className="mt-2 block text-xs text-white/40">{new Date(review.createdAt).toLocaleDateString()}</time>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/business/manage/catalogue" className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">Manage product catalogue</Link>
              <Link href={`/business/${data.businessSlug}`} className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">View public business page</Link>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
