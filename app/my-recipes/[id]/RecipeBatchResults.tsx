"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Qty } from "@/app/components/Units";

type FinishedBatchResult = {
  id: string;
  name: string | null;
  finished_date: string | null;
  startdato: string | null;
  og: number | string | null;
  fg: number | string | null;
  abv: number | string | null;
  volume_l: number | string | null;
  packaged_volume_l: number | string | null;
  recipe_snapshot?: {
    og?: number | string | null;
    fg?: number | string | null;
    abv?: number | string | null;
  } | null;
};

function finiteNumber(value: number | string | null) {
  if (value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatGravity(value: number | string | null) {
  const number = finiteNumber(value);
  return number === null ? "—" : number.toFixed(3);
}

function formatAbv(batch: FinishedBatchResult) {
  const recorded = finiteNumber(batch.abv);
  if (recorded !== null) return `${recorded.toFixed(1)}%`;

  const og = finiteNumber(batch.og);
  const fg = finiteNumber(batch.fg);
  return og !== null && fg !== null && og >= fg
    ? `${((og - fg) * 131.25).toFixed(1)}%`
    : "—";
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function consistentDeviation(
  deviations: number[],
  threshold: number
): { count: number; total: number; direction: "above" | "below"; average: number } | null {
  if (deviations.length < 3) return null;

  const above = deviations.filter((value) => value > 0);
  const below = deviations.filter((value) => value < 0);
  const requiredCount = Math.ceil((deviations.length * 2) / 3);
  const directionValues =
    above.length >= requiredCount
      ? above
      : below.length >= requiredCount
        ? below
        : null;
  if (!directionValues) return null;

  const mean = average(directionValues);
  if (mean === null || Math.abs(mean) < threshold - 1e-9) return null;
  return {
    count: directionValues.length,
    total: deviations.length,
    direction: mean > 0 ? "above" : "below",
    average: mean,
  };
}

export default function RecipeBatchResults({ recipeId }: { recipeId: string }) {
  const [batches, setBatches] = useState<FinishedBatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const response = await fetch(
        `/api/recipes/${encodeURIComponent(recipeId)}/batch-results`,
        { credentials: "include", cache: "no-store" }
      );
      const result: { batches?: FinishedBatchResult[]; error?: string } =
        await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not load recipe batch results");
      }
      if (active) setBatches(result.batches ?? []);
    }

    load()
      .catch((loadError) => {
        console.error("Could not load recipe batch results", loadError);
        if (active) setError("Finished batches for this recipe could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [recipeId]);

  const averageAbv = average(
    batches.flatMap((batch) => {
      const recorded = finiteNumber(batch.abv);
      if (recorded !== null) return [recorded];
      const og = finiteNumber(batch.og);
      const fg = finiteNumber(batch.fg);
      return og !== null && fg !== null && og >= fg
        ? [(og - fg) * 131.25]
        : [];
    })
  );
  const averagePackagedYield = average(
    batches.flatMap((batch) => {
      const planned = finiteNumber(batch.volume_l);
      const packaged = finiteNumber(batch.packaged_volume_l);
      return planned !== null &&
        planned > 0 &&
        packaged !== null &&
        packaged >= 0
        ? [(packaged / planned) * 100]
        : [];
    })
  );
  const averageOgDistance = average(
    batches.flatMap((batch) => {
      const actual = finiteNumber(batch.og);
      const target = finiteNumber(batch.recipe_snapshot?.og ?? null);
      return actual !== null && target !== null
        ? [Math.abs(actual - target)]
        : [];
    })
  );
  const averageFgDistance = average(
    batches.flatMap((batch) => {
      const actual = finiteNumber(batch.fg);
      const target = finiteNumber(batch.recipe_snapshot?.fg ?? null);
      return actual !== null && target !== null
        ? [Math.abs(actual - target)]
        : [];
    })
  );
  const ogPattern = consistentDeviation(
    batches.flatMap((batch) => {
      const actual = finiteNumber(batch.og);
      const target = finiteNumber(batch.recipe_snapshot?.og ?? null);
      return actual !== null && target !== null ? [actual - target] : [];
    }),
    0.002
  );
  const fgPattern = consistentDeviation(
    batches.flatMap((batch) => {
      const actual = finiteNumber(batch.fg);
      const target = finiteNumber(batch.recipe_snapshot?.fg ?? null);
      return actual !== null && target !== null ? [actual - target] : [];
    }),
    0.002
  );
  const reviewSuggestions = [
    ogPattern
      ? `In ${ogPattern.count} of ${ogPattern.total} comparable batches, OG was ${ogPattern.direction} the saved target by an average of ${ogPattern.average > 0 ? "+" : ""}${ogPattern.average.toFixed(3)}. Review ingredient measurements and batch volume before changing the recipe.`
      : null,
    fgPattern
      ? `In ${fgPattern.count} of ${fgPattern.total} comparable batches, FG was ${fgPattern.direction} the saved target by an average of ${fgPattern.average > 0 ? "+" : ""}${fgPattern.average.toFixed(3)}. Review fermentation conditions and gravity readings before changing the recipe.`
      : null,
  ].filter((suggestion): suggestion is string => suggestion !== null);

  return (
    <section
      aria-labelledby="recipe-batch-results-heading"
      className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:p-5"
    >
      <div className="mb-4">
        <h2
          id="recipe-batch-results-heading"
          className="text-lg font-semibold text-green-200"
        >
          Results from this recipe
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Compare finished batches made from this recipe.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-white/60">Loading finished batches…</p>
      ) : error ? (
        <p role="alert" className="text-sm text-red-300">{error}</p>
      ) : batches.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-white/60">
            No finished batches have been made from this recipe yet. Start one
            from this recipe to keep its targets and results together.
          </p>
          <Link
            href={`/my-recipes?start=${encodeURIComponent(recipeId)}`}
            className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-green-400/50 bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
          >
            Start a batch from this recipe
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-white/50">
            Performance across {batches.length} finished{" "}
            {batches.length === 1 ? "batch" : "batches"}.
          </p>
          <dl
            aria-label="Recipe performance summary"
            className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            <PerformanceMetric
              label="Average ABV"
              value={averageAbv === null ? "—" : `${averageAbv.toFixed(1)}%`}
            />
            <PerformanceMetric
              label="Average packaged yield"
              value={
                averagePackagedYield === null
                  ? "—"
                  : `${averagePackagedYield.toFixed(1)}%`
              }
            />
            <PerformanceMetric
              label="Average OG distance to target"
              value={
                averageOgDistance === null ? "—" : averageOgDistance.toFixed(3)
              }
            />
            <PerformanceMetric
              label="Average FG distance to target"
              value={
                averageFgDistance === null ? "—" : averageFgDistance.toFixed(3)
              }
            />
          </dl>
          <p className="mb-4 text-xs text-white/45">
            Gravity distances use each batch’s saved recipe targets; smaller is
            closer to target. Packaged yield uses recorded packaged volume.
          </p>
          <aside
            aria-label="Recipe performance patterns"
            className="mb-4 rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-3"
          >
            <h3 className="text-sm font-semibold text-amber-100">
              Patterns to review
            </h3>
            {reviewSuggestions.length > 0 ? (
              <ul className="mt-2 space-y-2 text-sm text-white/75">
                {reviewSuggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-white/55">
                No consistent target drift stands out yet. A review prompt
                appears when at least three comparable batches show a meaningful
                pattern.
              </p>
            )}
          </aside>
          <ul className="space-y-3">
            {batches.map((batch) => {
              const volume =
                finiteNumber(batch.packaged_volume_l) ??
                finiteNumber(batch.volume_l);

              return (
                <li
                  key={batch.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">
                      {batch.name || "Unnamed batch"}
                    </p>
                    <p className="mt-1 text-xs text-white/55">
                      Finished{" "}
                      {batch.finished_date
                        ? new Date(batch.finished_date).toLocaleDateString("en-GB")
                        : "date unavailable"}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:flex sm:flex-wrap sm:gap-x-5">
                      <div>
                        <dt className="text-xs text-white/50">OG</dt>
                        <dd>{formatGravity(batch.og)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-white/50">FG</dt>
                        <dd>{formatGravity(batch.fg)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-white/50">ABV</dt>
                        <dd>{formatAbv(batch)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-white/50">Packaged</dt>
                        <dd>
                          {volume === null ? "—" : <Qty kind="volume" value={volume} />}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <Link
                    href={`/brew-insights/${encodeURIComponent(batch.id)}`}
                    className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-green-200 hover:bg-white/10"
                  >
                    View results
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

function PerformanceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-3">
      <dt className="text-xs leading-snug text-white/55">{label}</dt>
      <dd className="mt-2 font-semibold text-green-100">{value}</dd>
    </div>
  );
}
