"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import { Qty } from "@/app/components/Units";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { saveDownload } from "@/lib/desktopDownloads";
import PageGuide from "@/app/components/PageGuide";

type Batch = {
  id: string;
  name: string | null;
  type: string | null;
  status: string | null;
  startdato: string | null;
  finished_date: string | null;
  og: number | string | null;
  fg: number | string | null;
  abv: number | string | null;
  volume_l: number | string | null;
  packaged_volume_l?: number | string | null;
  recipe_snapshot?: {
    og?: number | string | null;
    abv?: number | string | null;
    volume_l?: number | string | null;
  } | null;
};

function finiteNumber(value: number | string | null) {
  if (value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function batchLabel(batch: Batch) {
  const name = batch.name?.trim();
  return name && name.toLowerCase() !== "null" ? name : "Unnamed batch";
}

function isFinished(batch: Batch) {
  return Boolean(batch.finished_date) ||
    ["finished", "avsluttet"].includes(String(batch.status ?? "").toLowerCase());
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short" });
}

export default function BrewInsightsPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [premiumRequired, setPremiumRequired] = useState(false);
  const [selectedType, setSelectedType] = useState("All");
  const [comparisonBatchIds, setComparisonBatchIds] = useState<[string, string]>([
    "",
    "",
  ]);
  const [lifecycleMigrationRequired, setLifecycleMigrationRequired] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseBrowser.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        router.replace("/auth/login");
        return;
      }

      const response = await fetch("/api/brew-insights", {
        cache: "no-store",
        credentials: "include",
      });
      const result: {
        batches?: Batch[];
        lifecycleMigrationRequired?: boolean;
        error?: string;
      } = await response.json();
      if (response.status === 403) {
        if (active) setPremiumRequired(true);
        return;
      }
      if (!response.ok) throw new Error(result.error || "Could not load brewing insights");
      if (active) {
        setBatches(result.batches ?? []);
        setLifecycleMigrationRequired(result.lifecycleMigrationRequired === true);
      }

    }

    load()
      .catch((loadError) => {
        console.error("Could not load brewing insights", loadError);
        if (active) setError("Your brewing analytics could not be loaded. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  const visibleBatches =
    selectedType === "All" ? batches : batches.filter((batch) => batch.type === selectedType);
  const completed = visibleBatches.filter(isFinished);
  const comparisonBatches = comparisonBatchIds.map(
    (batchId) => batches.find((batch) => batch.id === batchId) ?? null
  );
  const comparisonRows = [
    {
      label: "Brew type",
      values: comparisonBatches.map((batch) => batch?.type || "—"),
    },
    {
      label: "Status",
      values: comparisonBatches.map((batch) => batch?.status || "—"),
    },
    {
      label: "Started",
      values: comparisonBatches.map((batch) =>
        batch?.startdato ? new Date(batch.startdato).toLocaleDateString() : "—"
      ),
    },
    {
      label: "Finished",
      values: comparisonBatches.map((batch) =>
        batch?.finished_date
          ? new Date(batch.finished_date).toLocaleDateString()
          : "—"
      ),
    },
    {
      label: "Original gravity · target",
      values: comparisonBatches.map((batch) => {
        const value = finiteNumber(batch?.recipe_snapshot?.og ?? null);
        return value === null ? "—" : value.toFixed(3);
      }),
    },
    {
      label: "Original gravity · actual",
      values: comparisonBatches.map((batch) => {
        const value = finiteNumber(batch?.og ?? null);
        return value === null ? "—" : value.toFixed(3);
      }),
    },
    {
      label: "Final gravity",
      values: comparisonBatches.map((batch) => {
        const value = finiteNumber(batch?.fg ?? null);
        return value === null ? "—" : value.toFixed(3);
      }),
    },
    {
      label: "ABV · target",
      values: comparisonBatches.map((batch) => {
        const value = finiteNumber(batch?.recipe_snapshot?.abv ?? null);
        return value === null ? "—" : `${value.toFixed(1)}%`;
      }),
    },
    {
      label: "ABV · actual",
      values: comparisonBatches.map((batch) => {
        const storedAbv = finiteNumber(batch?.abv ?? null);
        const og = finiteNumber(batch?.og ?? null);
        const fg = finiteNumber(batch?.fg ?? null);
        const value =
          storedAbv ??
          (og !== null && fg !== null && og >= fg ? (og - fg) * 131.25 : null);
        return value === null ? "—" : `${value.toFixed(1)}%`;
      }),
    },
    {
      label: "Planned volume",
      values: comparisonBatches.map((batch) => {
        const value = finiteNumber(batch?.recipe_snapshot?.volume_l ?? null);
        return value === null ? "—" : `${value.toFixed(1)} L`;
      }),
    },
    {
      label: "Batch volume",
      values: comparisonBatches.map((batch) => {
        const value = finiteNumber(batch?.volume_l ?? null);
        return value === null ? "—" : `${value.toFixed(1)} L`;
      }),
    },
    {
      label: "Packaged volume",
      values: comparisonBatches.map((batch) => {
        const value = finiteNumber(batch?.packaged_volume_l ?? null);
        return value === null ? "—" : `${value.toFixed(1)} L`;
      }),
    },
  ];
  const durations = completed.flatMap((batch) => {
    if (!batch.startdato || !batch.finished_date) return [];
    const start = new Date(batch.startdato).getTime();
    const finish = new Date(batch.finished_date).getTime();
    const days = (finish - start) / (24 * 60 * 60 * 1000);
    return Number.isFinite(days) && days >= 0 ? [days] : [];
  });
  const abvValues = completed.flatMap((batch) => {
    const storedAbv = finiteNumber(batch.abv);
    if (storedAbv !== null && storedAbv >= 0) return [storedAbv];
    const og = finiteNumber(batch.og);
    const fg = finiteNumber(batch.fg);
    return og !== null && fg !== null && og >= fg ? [(og - fg) * 131.25] : [];
  });
  const avgDuration = durations.length
    ? durations.reduce((total, duration) => total + duration, 0) / durations.length
    : null;
  const avgAbv = abvValues.length
    ? abvValues.reduce((total, abv) => total + abv, 0) / abvValues.length
    : null;
  const totalVolume = visibleBatches.reduce(
    (total, batch) => total + (finiteNumber(batch.volume_l) ?? 0),
    0
  );

  const typeStats = [...batches.reduce((stats, batch) => {
    const type = batch.type?.trim() || "Other";
    const current = stats.get(type) ?? { type, count: 0, volume: 0, completed: 0 };
    current.count += 1;
    current.volume += finiteNumber(batch.volume_l) ?? 0;
    current.completed += isFinished(batch) ? 1 : 0;
    stats.set(type, current);
    return stats;
  }, new Map<string, { type: string; count: number; volume: number; completed: number }>()).values()]
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

  const monthlyFinished = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, index) =>
      new Date(now.getFullYear(), now.getMonth() - 11 + index, 1)
    );
    const counts = new Map(months.map((month) => [monthKey(month), 0]));
    for (const batch of visibleBatches.filter(isFinished)) {
      const dateValue = batch.finished_date || batch.startdato;
      if (!dateValue) continue;
      const date = new Date(dateValue);
      if (Number.isFinite(date.getTime())) {
        const key = monthKey(date);
        if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return months.map((month) => ({
      date: month,
      count: counts.get(monthKey(month)) ?? 0,
    }));
  }, [visibleBatches]);
  const maxMonthly = Math.max(1, ...monthlyFinished.map((month) => month.count));
  const attenuationValues = completed.flatMap((batch) => {
    const og = finiteNumber(batch.og);
    const fg = finiteNumber(batch.fg);
    if (og === null || fg === null || og <= 1 || fg > og) return [];
    return [((og - fg) / (og - 1)) * 100];
  });
  const averageAttenuation = attenuationValues.length
    ? attenuationValues.reduce((sum, value) => sum + value, 0) / attenuationValues.length
    : null;
  const packagedYieldValues = completed.flatMap((batch) => {
    const plannedVolume = finiteNumber(batch.volume_l);
    const packagedVolume = finiteNumber(batch.packaged_volume_l ?? null);
    if (
      plannedVolume === null ||
      packagedVolume === null ||
      plannedVolume <= 0 ||
      packagedVolume < 0
    ) {
      return [];
    }
    return [(packagedVolume / plannedVolume) * 100];
  });
  const averagePackagedYield = packagedYieldValues.length
    ? packagedYieldValues.reduce((sum, value) => sum + value, 0) /
      packagedYieldValues.length
    : null;
  const ogVarianceValues = completed.flatMap((batch) => {
    const actual = finiteNumber(batch.og);
    const planned = finiteNumber(batch.recipe_snapshot?.og ?? null);
    return actual !== null && planned !== null ? [actual - planned] : [];
  });
  const averageOgVariance = ogVarianceValues.length
    ? ogVarianceValues.reduce((sum, value) => sum + value, 0) /
      ogVarianceValues.length
    : null;
  const abvVarianceValues = completed.flatMap((batch) => {
    const actual = finiteNumber(batch.abv);
    const planned = finiteNumber(batch.recipe_snapshot?.abv ?? null);
    return actual !== null && planned !== null ? [actual - planned] : [];
  });
  const averageAbvVariance = abvVarianceValues.length
    ? abvVarianceValues.reduce((sum, value) => sum + value, 0) /
      abvVarianceValues.length
    : null;

  async function downloadCsv() {
    const rows = [
      ["Batch", "Type", "Status", "Started", "Finished", "OG", "FG", "ABV", "Volume"],
      ...visibleBatches.map((batch) => [
        batch.name ?? "",
        batch.type ?? "",
        batch.status ?? "",
        batch.startdato ?? "",
        batch.finished_date ?? "",
        batch.og ?? "",
        batch.fg ?? "",
        batch.abv ?? "",
        batch.volume_l ?? "",
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    await saveDownload(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      "batchlogg-brewing-insights.csv"
    );
  }

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="relative mx-auto w-full max-w-5xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-8 sm:pt-16">
        <div className="absolute left-4 top-3 z-20">
          <BackButton />
        </div>
        <div className="absolute right-4 top-3 z-20">
          <MenuOverlay current="brew-insights" />
        </div>
        <PageHeading
          title="Brewing insights"
          subtitle="Private trends from the batches you’ve logged."
        />

        {premiumRequired ? (
          <div className="rounded-xl border border-green-400/20 bg-green-500/10 p-6 text-center">
            <p className="text-white/80">Brewing insights are part of Batchlogg Premium.</p>
            <a href="/premium" className="mt-4 inline-block rounded-lg bg-green-700 px-5 py-3 font-semibold hover:bg-green-600">Explore Premium</a>
          </div>
        ) : error && <p role="alert" className="mb-5 rounded-lg bg-red-950/50 p-3 text-center text-red-200">{error}</p>}
        {!premiumRequired && lifecycleMigrationRequired && (
          <p role="status" className="mb-5 rounded-lg border border-amber-400/30 bg-amber-950/30 p-3 text-sm text-amber-100">
            Packaging and recipe-result comparisons will appear after the batch
            lifecycle database migration is applied. Existing insights remain available.
          </p>
        )}
        {!premiumRequired && loading ? (
          <p className="py-12 text-center text-white/60">Loading your brewing history…</p>
        ) : !premiumRequired && batches.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
            <p className="text-white/70">Log a batch to start building your brewing insights.</p>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mt-4 rounded-lg border border-green-500 bg-green-700 px-4 py-2 font-semibold hover:bg-green-600"
            >
              Go to dashboard
            </button>
          </div>
        ) : !premiumRequired ? (
          <>
            <section className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:justify-start" role="group" aria-label="Analyze batch type">
                {["All", ...new Set(batches.map((batch) => batch.type).filter((type): type is string => Boolean(type))).values()].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    aria-pressed={selectedType === type}
                    className={`rounded-lg border px-3 py-2 text-center text-sm ${
                      selectedType === type
                        ? "border-green-500 bg-green-700"
                        : "border-white/20 bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    {type === "All" ? "All types" : type}
                  </button>
                ))}
                <button type="button" onClick={downloadCsv} className="mx-auto shrink-0 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 sm:ml-auto sm:mr-0">
                  Export CSV
                </button>
              </div>
            </section>

            <section aria-label="Brewing summary" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
              <Metric label="Batches logged" value={visibleBatches.length.toString()} />
              <Metric label="Finished batches" value={completed.length.toString()} />
              <Metric label="Average final ABV" value={avgAbv === null ? "—" : `${avgAbv.toFixed(1)}%`} />
              <Metric label="Average time to finish" value={avgDuration === null ? "—" : `${avgDuration.toFixed(0)} days`} />
              <Metric label="Average attenuation" value={averageAttenuation === null ? "—" : `${averageAttenuation.toFixed(1)}%`} />
              <Metric label="Average packaged yield" value={averagePackagedYield === null ? "—" : `${averagePackagedYield.toFixed(1)}%`} />
              <Metric label="Average OG vs recipe" value={averageOgVariance === null ? "—" : `${averageOgVariance >= 0 ? "+" : ""}${averageOgVariance.toFixed(3)}`} />
              <Metric label="Average ABV vs recipe" value={averageAbvVariance === null ? "—" : `${averageAbvVariance >= 0 ? "+" : ""}${averageAbvVariance.toFixed(1)} pp`} />
            </section>

            <section
              aria-labelledby="compare-batches-title"
              className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6"
            >
              <div>
                <h2
                  id="compare-batches-title"
                  className="text-lg font-semibold text-green-300"
                >
                  Compare batches
                </h2>
                <p className="mt-1 text-sm text-white/55">
                  Choose two batches to compare their recipe targets and recorded results.
                </p>
              </div>
              {batches.length < 2 ? (
                <p className="mt-4 rounded-lg bg-black/20 p-4 text-sm text-white/60">
                  Log at least two batches to compare them here.
                </p>
              ) : (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {comparisonBatchIds.map((selectedId, index) => (
                      <label
                        key={index}
                        className="block text-sm font-medium text-white/75"
                      >
                        Batch {index + 1}
                        <select
                          value={selectedId}
                          onChange={(event) =>
                            setComparisonBatchIds((current) => {
                              const next: [string, string] = [...current];
                              next[index] = event.target.value;
                              return next;
                            })
                          }
                          className="mt-2 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                        >
                          <option value="">Choose a batch</option>
                          {batches.map((batch) => (
                            <option
                              key={batch.id}
                              value={batch.id}
                              disabled={
                                comparisonBatchIds[1 - index] === batch.id
                              }
                            >
                              {batchLabel(batch)}
                              {batch.finished_date
                                ? ` · ${new Date(batch.finished_date).toLocaleDateString()}`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  {comparisonBatches.every(Boolean) && (
                    <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
                      <table className="w-full min-w-[34rem] text-left text-sm">
                        <thead className="bg-black/25">
                          <tr>
                            <th scope="col" className="px-3 py-3 font-medium text-white/55">
                              Measurement
                            </th>
                            {comparisonBatches.map((batch) => (
                              <th
                                key={batch?.id}
                                scope="col"
                                className="px-3 py-3 font-semibold text-green-200"
                              >
                                {batch ? batchLabel(batch) : "Unnamed batch"}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {comparisonRows.map((row) => (
                            <tr
                              key={row.label}
                              className="border-t border-white/10"
                            >
                              <th
                                scope="row"
                                className="px-3 py-2.5 font-medium text-white/65"
                              >
                                {row.label}
                              </th>
                              {row.values.map((value, index) => (
                                <td
                                  key={comparisonBatches[index]?.id}
                                  className="px-3 py-2.5 text-white/85"
                                >
                                  {value}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
              <h2 className="mb-1 text-lg font-semibold text-green-300">Finished batches by month</h2>
              <p className="mb-5 text-sm text-white/55">Last 12 months, based on finish date (or start date when no finish date was recorded).</p>
              <div
                role="img"
                aria-label={`Finished batches per month: ${monthlyFinished.map(({ date, count }) => `${monthLabel(date)} ${count}`).join(", ")}`}
                className="grid grid-cols-6 gap-2 sm:grid-cols-12"
              >
                {monthlyFinished.map(({ date, count }) => (
                  <div key={monthKey(date)} className="flex min-w-0 flex-col items-center gap-2">
                    <span className="text-xs text-white/60">{count}</span>
                    <div className="flex h-28 w-full items-end rounded bg-black/30 p-1">
                      <div
                        className="w-full rounded-sm bg-green-500/80"
                        style={{ height: `${Math.max(count ? 8 : 0, (count / maxMonthly) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/60">{monthLabel(date)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-green-300">By brew type</h2>
                  <p className="text-sm text-white/55">
                    {totalVolume > 0 ? <>Logged volume: <Qty kind="volume" value={totalVolume} /></> : "Volume is shown when recorded."}
                  </p>
                </div>
                <span className="text-xs text-white/45">Totals include active and finished batches</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead className="border-b border-white/10 text-white/55">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-medium">Type</th>
                      <th scope="col" className="py-2 px-3 text-right font-medium">Batches</th>
                      <th scope="col" className="py-2 px-3 text-right font-medium">Finished</th>
                      <th scope="col" className="py-2 pl-3 text-right font-medium">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeStats.map((stat) => (
                      <tr key={stat.type} className="border-b border-white/5 last:border-0">
                        <th scope="row" className="py-3 pr-3 font-medium">{stat.type}</th>
                        <td className="py-3 px-3 text-right">{stat.count}</td>
                        <td className="py-3 px-3 text-right">{stat.completed}</td>
                        <td className="py-3 pl-3 text-right"><Qty kind="volume" value={stat.volume} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold text-green-300">Recent finished batches</h2>
              <ul className="space-y-2">
                {completed.slice(0, 8).map((batch) => {
                  const abv = finiteNumber(batch.abv) ??
                    (() => {
                      const og = finiteNumber(batch.og);
                      const fg = finiteNumber(batch.fg);
                      return og !== null && fg !== null && og >= fg ? (og - fg) * 131.25 : null;
                    })();
                  return (
                    <li key={batch.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="min-w-0">
                        <span className="font-medium">{batchLabel(batch)}</span>
                        <span className="mt-1 block text-sm text-white/60">
                          {[batch.type, batch.finished_date ? new Date(batch.finished_date).toLocaleDateString() : null, abv === null ? null : `${abv.toFixed(1)}% ABV`]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <Link
                        href={`/brew-insights/${encodeURIComponent(batch.id)}`}
                        className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
                      >
                        View batch insights
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        ) : null}
      </div>
      <PageGuide
        buttonLabel="Brewing insights guide"
        eyebrow="Learn from your brewing history"
        title="Your brewing insights, explained."
        description="Use your recorded batches to spot patterns, compare results with recipe targets, and see how your brewing changes over time."
        sectionHeading="Explore your insights"
        illustration="insights"
        footer="Insights are based on the batch details you have recorded."
        sections={[
          {
            title: "Filter by brew type",
            description: "Focus the summary and monthly trends on one beverage type or view them all.",
          },
          {
            title: "Read the summary",
            description: "Review batch counts, average results, finish times, and recipe-target differences.",
          },
          {
            title: "Compare two batches",
            description: "Choose specific batches to compare their planned targets with recorded results.",
          },
          {
            title: "Explore trends",
            description: "Use the monthly chart and brew-type breakdown to see how your batches add up.",
          },
          {
            title: "Review finished batches",
            description: "Open a batch’s results to revisit its recorded measurements and outcome.",
          },
          {
            title: "Export your data",
            description: "Use Export CSV to save the brewing-insights batch summary.",
          },
        ]}
      />
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
      <p className="text-xs text-white/55">{label}</p>
      <p className="mt-2 text-xl font-semibold text-green-200">{value}</p>
    </div>
  );
}
