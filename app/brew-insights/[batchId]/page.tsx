"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import BottleAging from "./BottleAging";
import { UnitAwareText } from "@/app/components/Units";

type BatchInsight = {
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
  packaged_volume_l: number | string | null;
  packaging_method: string | null;
  bottle_volume_l: number | string | null;
  keg_volume_l: number | string | null;
  package_count: number | null;
  carbonation_method: string | null;
  target_carbonation_volumes: number | string | null;
  priming_sugar_g: number | string | null;
  tasting_notes: string | null;
  finished_notes: string | null;
  recipe_id: string | null;
  recipe_snapshot: Record<string, unknown> | null;
};

function numberOrNull(value: unknown): number | null {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    value === ""
  ) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-white/50">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default function BatchInsightsPage() {
  const params = useParams<{ batchId: string }>();
  const searchParams = useSearchParams();
  const batchId = params.batchId;
  const recipeLimitReached = searchParams.get("recipeLimit") === "reached";
  const [batch, setBatch] = useState<BatchInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    void fetch(`/api/batches/${encodeURIComponent(batchId)}/insights`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        const result: { batch?: BatchInsight; error?: string } =
          await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Could not load batch insights.");
        }
        if (!result.batch) {
          throw new Error("Batch insights were missing from the response.");
        }
        if (active) setBatch(result.batch);
      })
      .catch((loadError: unknown) => {
        console.error("Could not load batch-specific insights", loadError);
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load batch insights."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [batchId]);

  const originalGravity = numberOrNull(batch?.og);
  const finalGravity = numberOrNull(batch?.fg);
  const finalAbv =
    numberOrNull(batch?.abv) ??
    (originalGravity !== null && finalGravity !== null
      ? (originalGravity - finalGravity) * 131.25
      : null);
  const packagedVolume = numberOrNull(batch?.packaged_volume_l);
  const plannedVolume = numberOrNull(batch?.volume_l);
  const packagedYield =
    packagedVolume !== null && plannedVolume !== null && plannedVolume > 0
      ? (packagedVolume / plannedVolume) * 100
      : null;
  const recipeSnapshot = batch?.recipe_snapshot ?? null;
  const plannedOg = numberOrNull(recipeSnapshot?.og);
  const plannedFg = numberOrNull(recipeSnapshot?.fg);
  const plannedAbv = numberOrNull(recipeSnapshot?.abv);
  const plannedVolumeFromRecipe = numberOrNull(recipeSnapshot?.volume);
  const ogVariance =
    originalGravity !== null && plannedOg !== null
      ? originalGravity - plannedOg
      : null;
  const fgVariance =
    finalGravity !== null && plannedFg !== null
      ? finalGravity - plannedFg
      : null;
  const abvVariance =
    finalAbv !== null && plannedAbv !== null ? finalAbv - plannedAbv : null;
  const finishedDate = batch?.finished_date
    ? new Date(batch.finished_date)
    : null;
  const startDate = batch?.startdato ? new Date(batch.startdato) : null;
  const fermentationDays =
    finishedDate && startDate
      ? Math.max(
          0,
          Math.floor(
            (finishedDate.getTime() - startDate.getTime()) / 86_400_000
          )
        )
      : null;
  const nextBrewNotes = [
    ogVariance !== null && Math.abs(ogVariance) >= 0.002
      ? `Original gravity finished ${ogVariance > 0 ? "above" : "below"} target by ${Math.abs(ogVariance).toFixed(3)}. Check measured volume and extraction before changing the recipe.`
      : null,
    fgVariance !== null && Math.abs(fgVariance) >= 0.002
      ? `Final gravity finished ${fgVariance > 0 ? "above" : "below"} target by ${Math.abs(fgVariance).toFixed(3)}. Review fermentation conditions and readings before changing the recipe.`
      : null,
    packagedYield !== null && packagedYield < 95
      ? `Packaged yield was ${packagedYield.toFixed(1)}% of planned volume. Note transfer losses when planning the next batch.`
      : null,
  ].filter((note): note is string => note !== null);

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="relative mx-auto w-full max-w-4xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-8 sm:pt-16">
        <div className="absolute left-4 top-3 z-20">
          <BackButton />
        </div>
        <div className="absolute right-4 top-3 z-20">
          <MenuOverlay current="brew-insights" />
        </div>
        <PageHeading
          title="Batch insights"
          subtitle="A closer look at how this batch turned out."
        />

        {recipeLimitReached && (
          <p role="status" className="mb-4 rounded-lg border border-amber-400/30 bg-amber-950/40 p-3 text-sm text-amber-100">
            Your batch was finished, but it wasn&apos;t saved as a recipe because free accounts can save up to 20 recipes.
            {" "}<Link href="/my-recipes" className="font-semibold underline">Manage recipes</Link>
            {" "}or{" "}<Link href="/premium" className="font-semibold underline">view Premium</Link>.
          </p>
        )}

        {loading ? (
          <p role="status" className="py-12 text-center text-white/60">
            Loading batch results…
          </p>
        ) : error ? (
          <section className="rounded-xl border border-amber-400/30 bg-amber-950/30 p-5">
            <p role="alert" className="text-sm text-amber-100">{error}</p>
            <Link
              href="/batch-history"
              className="mt-4 inline-block text-sm font-semibold text-white underline underline-offset-4"
            >
              Go to batch history
            </Link>
          </section>
        ) : batch ? (
          <>
            <header className="mt-6 rounded-xl border border-green-400/20 bg-green-500/10 p-5">
              <p className="text-sm font-medium text-green-200">
                Batch packaged and finished
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                {batch.name || "Unnamed batch"}
              </h2>
              <p className="mt-1 text-sm text-white/60">
                {[batch.type, finishedDate?.toLocaleDateString()]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </header>

            <section
              aria-label="Batch results"
              className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"
            >
              <Metric
                label="Original gravity"
                value={originalGravity === null ? "—" : originalGravity.toFixed(3)}
              />
              <Metric
                label="Final gravity"
                value={finalGravity === null ? "—" : finalGravity.toFixed(3)}
              />
              <Metric
                label="Final ABV"
                value={finalAbv === null ? "—" : `${finalAbv.toFixed(1)}%`}
              />
              <Metric
                label="Packaged"
                value={
                  packagedVolume === null
                    ? "—"
                    : `${packagedVolume.toFixed(2)} L`
                }
              />
              <Metric
                label="Packaged yield"
                value={packagedYield === null ? "—" : `${packagedYield.toFixed(1)}%`}
              />
              <Metric
                label="Fermentation time"
                value={
                  fermentationDays === null
                    ? "—"
                    : `${fermentationDays} ${fermentationDays === 1 ? "day" : "days"}`
                }
              />
            </section>

            <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-semibold text-green-200">
                Recipe targets vs. results
              </h2>
              {plannedOg === null &&
              plannedFg === null &&
              plannedAbv === null &&
              plannedVolumeFromRecipe === null ? (
                <p className="mt-2 text-sm text-white/60">
                  This batch has no saved recipe targets to compare.
                </p>
              ) : (
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  {plannedOg !== null && originalGravity !== null && (
                    <Comparison
                      label="Original gravity"
                      target={plannedOg.toFixed(3)}
                      actual={originalGravity.toFixed(3)}
                      variance={
                        ogVariance === null
                          ? null
                          : `${ogVariance >= 0 ? "+" : ""}${ogVariance.toFixed(3)}`
                      }
                    />
                  )}
                  {plannedFg !== null && finalGravity !== null && (
                    <Comparison
                      label="Final gravity"
                      target={plannedFg.toFixed(3)}
                      actual={finalGravity.toFixed(3)}
                      variance={
                        fgVariance === null
                          ? null
                          : `${fgVariance >= 0 ? "+" : ""}${fgVariance.toFixed(3)}`
                      }
                    />
                  )}
                  {plannedAbv !== null && finalAbv !== null && (
                    <Comparison
                      label="ABV"
                      target={`${plannedAbv.toFixed(1)}%`}
                      actual={`${finalAbv.toFixed(1)}%`}
                      variance={
                        abvVariance === null
                          ? null
                          : `${abvVariance >= 0 ? "+" : ""}${abvVariance.toFixed(1)} pp`
                      }
                    />
                  )}
                  {plannedVolumeFromRecipe !== null &&
                    plannedVolume !== null && (
                      <Comparison
                        label="Planned volume"
                        target={`${plannedVolumeFromRecipe} L`}
                        actual={`${plannedVolume} L`}
                        variance={null}
                      />
                    )}
                </dl>
              )}
            </section>

            <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-semibold text-green-200">
                Packaging
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <Comparison
                  label="Method"
                  target={batch.packaging_method || "Not recorded"}
                  actual={null}
                  variance={null}
                />
                {numberOrNull(batch.bottle_volume_l) !== null && (
                  <Comparison
                    label="Bottled"
                    target={`${numberOrNull(batch.bottle_volume_l)?.toFixed(2)} L`}
                    actual={null}
                    variance={null}
                  />
                )}
                {numberOrNull(batch.keg_volume_l) !== null && (
                  <Comparison
                    label="Kegged"
                    target={`${numberOrNull(batch.keg_volume_l)?.toFixed(2)} L`}
                    actual={null}
                    variance={null}
                  />
                )}
                {batch.package_count !== null && (
                  <Comparison
                    label="Packages"
                    target={String(batch.package_count)}
                    actual={null}
                    variance={null}
                  />
                )}
                {batch.carbonation_method && (
                  <Comparison
                    label="Carbonation"
                    target={batch.carbonation_method}
                    actual={
                      numberOrNull(batch.target_carbonation_volumes) === null
                        ? null
                        : `${numberOrNull(batch.target_carbonation_volumes)?.toFixed(1)} volumes CO₂`
                    }
                    variance={null}
                  />
                )}
                {numberOrNull(batch.priming_sugar_g) !== null && (
                  <Comparison
                    label="Priming sugar"
                    target={`${numberOrNull(batch.priming_sugar_g)?.toFixed(1)} g`}
                    actual={null}
                    variance={null}
                  />
                )}
              </dl>
            </section>

            <BottleAging batchId={batch.id} />

            {(batch.finished_notes || batch.tasting_notes) && (
              <section className="mt-6 grid gap-3 sm:grid-cols-2">
                {batch.finished_notes && (
                  <NoteCard title="Finishing notes" note={batch.finished_notes} />
                )}
                {batch.tasting_notes && (
                  <NoteCard title="Tasting notes" note={batch.tasting_notes} />
                )}
              </section>
            )}

            <section
              aria-labelledby="next-brew-title"
              className="mt-6 rounded-xl border border-green-300/20 bg-green-300/[0.05] p-5"
            >
              <h2 id="next-brew-title" className="text-lg font-semibold text-green-200">
                Take this batch into your next brew
              </h2>
              <p className="mt-1 text-sm text-white/65">
                Keep the result as a learning point, then use the original recipe as your starting plan.
              </p>
              {nextBrewNotes.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/75">
                  {nextBrewNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
              {batch.recipe_id ? (
                <Link
                  href={`/my-recipes?start=${encodeURIComponent(batch.recipe_id)}`}
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-green-400 bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-600"
                >
                  Brew this recipe again
                </Link>
              ) : (
                <p className="mt-3 text-sm text-white/60">
                  This batch is not linked to a saved recipe, so it can’t be prefilled for another brew.
                </p>
              )}
            </section>

            <nav aria-label="Batch follow-up" className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/batch-history?batchId=${encodeURIComponent(batch.id)}`}
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/20"
              >
                Review full batch history
              </Link>
              {batch.recipe_id && (
                <Link
                  href={`/my-recipes/${encodeURIComponent(batch.recipe_id)}`}
                  className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
                >
                  View source recipe
                </Link>
              )}
              <Link
                href="/brew-insights"
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
              >
                All brewing insights
              </Link>
            </nav>
          </>
        ) : null}
      </div>
    </main>
  );
}

function Comparison({
  label,
  target,
  actual,
  variance,
}: {
  label: string;
  target: string;
  actual: string | null;
  variance: string | null;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-white/50">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-white/85">
        {actual ? (
          <>
            Target {target} · Actual {actual}
            {variance && <span className="text-white/55"> · {variance}</span>}
          </>
        ) : (
          target
        )}
      </dd>
    </div>
  );
}

function NoteCard({ title, note }: { title: string; note: string }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="font-semibold text-green-200">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/75">
        <UnitAwareText text={note} />
      </p>
    </section>
  );
}
