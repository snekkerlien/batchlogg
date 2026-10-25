"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";
import BottleAging from "./BottleAging";
import PublicMentionText from "@/app/components/PublicMentionText";
import BatchRecipeCard, {
  type BatchRecipeDetails,
} from "@/app/kar/[id]/BatchRecipeCard";
import { formatSecondaryAdditions } from "@/lib/recipes/secondaryAdditions";

type BatchInsight = Omit<Partial<BatchRecipeDetails>, "type"> & {
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
  secondary_startdate: string | null;
  secondary_additions: string | null;
  secondary_notes: string | null;
  conditioning_startdate: string | null;
  conditioning_notes: string | null;
  ibu: number | string | null;
  ebc: number | string | null;
};

type GravityReading = {
  id: string;
  sg: number | string;
  created_at: string;
};

type ConditioningEntry = {
  id: string;
  entry_type: string;
  occurred_at: string;
  details: Record<string, string> | null;
  notes: string | null;
};

type BatchNote = {
  id: string;
  note: string | null;
  image_url: string | null;
  created_at: string;
};

const conditioningEntryLabels: Record<string, string> = {
  rack: "Rack / transfer",
  clarify: "Clarify",
  mature: "Mature / age",
  stabilize: "Stabilize",
  backsweeten: "Backsweeten",
  adjustment: "Add ingredient / adjust",
  taste: "Taste",
  other: "Other",
};

const conditioningDetailLabels: Record<string, string> = {
  volume: "Volume transferred",
  volume_loss_l: "Volume lost",
  gravity: "Gravity",
  agent: "Clarifying agent",
  amount: "Amount",
  unit: "Unit",
  contact_time: "Contact time",
  vessel: "Aging vessel / conditions",
  temperature: "Temperature",
  target_date: "Target tasting date",
  product: "Product",
  wait_hours: "Wait before next step",
  sweetener: "Sweetener",
  adjustment: "Ingredient / adjustment",
  aroma: "Aroma",
  flavor: "Flavor",
  next_step: "Next step",
  description: "Description",
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

function TimelineDate({ label, date }: { label: string; date?: string | null }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</dt>
      <dd className="mt-1 text-sm text-white/85">
        {date ? new Date(date).toLocaleDateString() : "Not recorded"}
      </dd>
    </div>
  );
}

export default function BatchInsightsPage() {
  const params = useParams<{ batchId: string }>();
  const searchParams = useSearchParams();
  const batchId = params.batchId;
  const recipeLimitReached = searchParams.get("recipeLimit") === "reached";
  const [batch, setBatch] = useState<BatchInsight | null>(null);
  const [readings, setReadings] = useState<GravityReading[]>([]);
  const [conditioningEntries, setConditioningEntries] = useState<ConditioningEntry[]>([]);
  const [conditioningActivityAvailable, setConditioningActivityAvailable] = useState(true);
  const [batchNotes, setBatchNotes] = useState<BatchNote[]>([]);
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
        const result: {
          batch?: BatchInsight;
          readings?: GravityReading[];
          conditioningEntries?: ConditioningEntry[];
          conditioningActivityAvailable?: boolean;
          notes?: BatchNote[];
          error?: string;
        } = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Could not load batch insights.");
        }
        if (!result.batch) {
          throw new Error("Batch insights were missing from the response.");
        }
        if (active) setBatch(result.batch);
        if (active) {
          setReadings(result.readings ?? []);
          setConditioningEntries(result.conditioningEntries ?? []);
          setConditioningActivityAvailable(
            result.conditioningActivityAvailable !== false
          );
          setBatchNotes(result.notes ?? []);
        }
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
  const rackEntries = conditioningEntries.filter((entry) => entry.entry_type === "rack");
  const rackLossEntries = rackEntries.filter((entry) => {
    const value = entry.details?.volume_loss_l;
    return value !== undefined && value !== null && value !== "";
  });
  const conditioningRackLoss = rackLossEntries.reduce(
    (total, entry) => total + (numberOrNull(entry.details?.volume_loss_l) ?? 0),
    0
  );
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

            <BatchRecipeCard
              batch={{ ...batch, type: batch.type || "Other" } as BatchRecipeDetails}
            />

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
                label="Recorded racking loss"
                value={rackLossEntries.length > 0
                  ? `${conditioningRackLoss.toFixed(2)} L`
                  : "Not recorded"}
              />
              <Metric
                label="Fermentation time"
                value={
                  fermentationDays === null
                    ? "—"
                    : `${fermentationDays} ${fermentationDays === 1 ? "day" : "days"}`
                }
              />
              {numberOrNull(batch.ibu) !== null && (
                <Metric label="IBU" value={numberOrNull(batch.ibu)!.toFixed(1)} />
              )}
              {numberOrNull(batch.ebc) !== null && (
                <Metric label="Color (EBC)" value={numberOrNull(batch.ebc)!.toFixed(1)} />
              )}
            </section>
            {rackLossEntries.length > 0 && rackLossEntries.length < rackEntries.length && (
              <p className="mt-2 text-sm text-white/55">
                Loss amounts are recorded for {rackLossEntries.length} of {rackEntries.length} rack/transfer entries.
              </p>
            )}

            <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-semibold text-green-200">Fermentation readings</h2>
              {readings.length === 0 ? (
                <p className="mt-3 text-sm text-white/60">No gravity readings recorded.</p>
              ) : (
                <ol className="mt-4 divide-y divide-white/10">
                  {readings.map((reading) => (
                    <li key={reading.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                      <time dateTime={reading.created_at} className="text-white/65">
                        {new Date(reading.created_at).toLocaleString()}
                      </time>
                      <span className="font-mono font-semibold text-white">
                        {Number(reading.sg).toFixed(3)} SG
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-semibold text-green-200">Fermentation and conditioning timeline</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <TimelineDate label="Primary fermentation started" date={batch.startdato} />
                <TimelineDate label="Secondary fermentation started" date={batch.secondary_startdate} />
                <TimelineDate label="Conditioning started" date={batch.conditioning_startdate} />
                <TimelineDate label="Packaged" date={batch.packaged_at} />
                <TimelineDate label="Finished" date={batch.finished_date} />
              </dl>
              {(batch.secondary_additions || batch.secondary_notes) && (
                <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
                  <h3 className="font-semibold text-white">Secondary fermentation</h3>
                  {batch.secondary_additions && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">
                      <strong>Additions:</strong>{" "}
                      {formatSecondaryAdditions(batch.secondary_additions)}
                    </p>
                  )}
                  {batch.secondary_notes && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-white/75">
                      <strong>Notes:</strong> <PublicMentionText text={batch.secondary_notes} unitAware />
                    </p>
                  )}
                </div>
              )}
              {batch.conditioning_notes && (
                <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
                  <h3 className="font-semibold text-white">Initial conditioning notes</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-white/75">
                    <PublicMentionText text={batch.conditioning_notes} unitAware />
                  </p>
                </div>
              )}
              {!conditioningActivityAvailable ? (
                <p role="status" className="mt-4 text-sm text-amber-200">
                  Conditioning activity details are unavailable until the conditioning database migration is applied.
                </p>
              ) : conditioningEntries.length > 0 ? (
                <ol className="mt-4 space-y-3">
                  {conditioningEntries.map((entry) => {
                    const details = entry.details ?? {};
                    return (
                      <li key={entry.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                        <div className="flex flex-wrap justify-between gap-2">
                          <h3 className="font-semibold text-white">
                            {conditioningEntryLabels[entry.entry_type] ?? "Conditioning action"}
                          </h3>
                          <time dateTime={entry.occurred_at} className="text-sm text-white/55">
                            {new Date(entry.occurred_at).toLocaleString()}
                          </time>
                        </div>
                        {Object.entries(details)
                          .filter(([key, value]) => key !== "unit" && Boolean(value))
                          .map(([key, value]) => (
                            <p key={key} className="mt-2 text-sm text-white/75">
                              <strong>{conditioningDetailLabels[key] ?? key}:</strong>{" "}
                              {key === "amount" || key === "volume"
                                ? `${value}${details.unit ? ` ${details.unit}` : key === "volume" ? " L" : ""}`
                                : key === "volume_loss_l"
                                  ? `${value} L`
                                : key === "wait_hours"
                                  ? `${value} hours`
                                  : value}
                            </p>
                          ))}
                        {entry.notes && (
                          <p className="mt-3 whitespace-pre-wrap text-sm text-white/75">
                            <PublicMentionText text={entry.notes} unitAware />
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="mt-4 text-sm text-white/60">No conditioning activity recorded.</p>
              )}
            </section>

            {batchNotes.length > 0 && (
              <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
                <h2 className="text-lg font-semibold text-green-200">Batch notes and attachments</h2>
                <ol className="mt-4 space-y-3">
                  {batchNotes.map((note) => (
                    <li key={note.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                      <time dateTime={note.created_at} className="text-xs text-white/50">
                        {new Date(note.created_at).toLocaleString()}
                      </time>
                      {note.note && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">
                          <PublicMentionText text={note.note} unitAware />
                        </p>
                      )}
                      {note.image_url && (
                        <a href={note.image_url} target="_blank" rel="noreferrer" className="mt-3 inline-block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={note.image_url} alt="Batch note attachment" className="max-h-80 rounded-lg object-contain" />
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}

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
        <PublicMentionText text={note} unitAware />
      </p>
    </section>
  );
}
