"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import { Qty } from "@/app/components/Units";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

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
};

function finiteNumber(value: number | string | null) {
  if (value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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

      const { data, error: batchesError } = await supabaseBrowser
        .from("batches")
        .select("id, name, type, status, startdato, finished_date, og, fg, abv, volume_l")
        .eq("user_id", session.user.id)
        .order("startdato", { ascending: false });
      if (batchesError) throw batchesError;
      if (active) setBatches(data ?? []);
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

  const completed = batches.filter(isFinished);
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
  const totalVolume = batches.reduce(
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
    for (const batch of completed) {
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
  }, [batches]);
  const maxMonthly = Math.max(1, ...monthlyFinished.map((month) => month.count));

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

        {error && <p role="alert" className="mb-5 rounded-lg bg-red-950/50 p-3 text-center text-red-200">{error}</p>}
        {loading ? (
          <p className="py-12 text-center text-white/60">Loading your brewing history…</p>
        ) : batches.length === 0 ? (
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
        ) : (
          <>
            <section aria-label="Brewing summary" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Batches logged" value={batches.length.toString()} />
              <Metric label="Finished batches" value={completed.length.toString()} />
              <Metric label="Average final ABV" value={avgAbv === null ? "—" : `${avgAbv.toFixed(1)}%`} />
              <Metric label="Average time to finish" value={avgDuration === null ? "—" : `${avgDuration.toFixed(0)} days`} />
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
                    <li key={batch.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
                      <span className="font-medium">{batch.name || "Unnamed batch"}</span>
                      <span className="text-sm text-white/60">
                        {[batch.type, batch.finished_date ? new Date(batch.finished_date).toLocaleDateString() : null, abv === null ? null : `${abv.toFixed(1)}% ABV`]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </div>
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
