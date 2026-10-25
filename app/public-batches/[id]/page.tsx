import { notFound, redirect } from "next/navigation";
import PageHeading from "@/app/components/PageHeading";
import PublicPageNavigation from "@/app/components/PublicPageNavigation";
import ActiveBatchOverview from "@/app/kar/[id]/ActiveBatchOverview";
import BatchRecipeCard from "@/app/kar/[id]/BatchRecipeCard";
import PublicMentionText from "@/app/components/PublicMentionText";
import { formatSecondaryAdditions } from "@/lib/recipes/secondaryAdditions";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PublicMentionedBatchPage({
  params,
}: {
  params: { id: string };
}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) {
    notFound();
  }

  const { supabase, serviceRole } = supabaseServer();
  const { data: batch, error: batchError } = await serviceRole
    .from("batches")
    .select(
      "id, user_id, batchnummer, name, type, status, startdato, created_at, aktivt_kar, og, fg, abv, volume_l, beer_subtype, beer_style, kit_url, malts, hops, dry_hops, boil_time, boil_volume_l, base_liquid, base_liquid_amount, honey_type, honey_amount, fruits, yeast, juice_type, sugar_amount, ingredients, steps, additives, full_process, ibu, ebc, secondary_startdate, secondary_additions, secondary_notes, conditioning_startdate, finished_date, packaged_volume_l, packaging_method, bottle_volume_l, keg_volume_l, package_count, carbonation_method, target_carbonation_volumes, priming_sugar_g, packaged_at, recipe_id"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (batchError) throw new Error(`Could not load public batch: ${batchError.message}`);
  if (!batch?.aktivt_kar) notFound();

  const { data: vessel, error: vesselError } = await serviceRole
    .from("kar")
    .select("id, is_public, user_id")
    .eq("id", batch.aktivt_kar)
    .maybeSingle();
  if (vesselError) throw new Error(`Could not check batch visibility: ${vesselError.message}`);
  if (!vessel) notFound();
  if (!vessel.is_public) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError && userError.name !== "AuthSessionMissingError") {
      throw new Error(`Could not verify the current user: ${userError.message}`);
    }
    redirect(user?.id === vessel.user_id ? `/kar/${vessel.id}` : "/members");
  }

  const { data: gravityReadings, error: gravityReadingsError } = await serviceRole
    .from("sg_readings")
    .select("id, sg, created_at")
    .eq("batch_id", batch.id)
    .order("created_at", { ascending: true });
  if (gravityReadingsError) {
    throw new Error(`Could not load public batch gravity readings: ${gravityReadingsError.message}`);
  }

  const { data: conditioningEntries, error: conditioningEntriesError } = await serviceRole
    .from("batch_conditioning_entries")
    .select("id, entry_type, occurred_at, details")
    .eq("batch_id", batch.id)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (conditioningEntriesError) {
    throw new Error(
      `Could not load public batch conditioning activity: ${conditioningEntriesError.message}`
    );
  }

  let publicSourceRecipe: { id: string; name: string | null } | null = null;
  if (batch.recipe_id) {
    const { data: recipe, error: recipeError } = await serviceRole
      .from("recipes")
      .select("id, name, user_id")
      .eq("id", batch.recipe_id)
      .eq("is_public", true)
      .maybeSingle();
    if (recipeError) throw new Error(`Could not check source recipe visibility: ${recipeError.message}`);
    if (recipe) {
      const { data: profile, error: profileError } = await serviceRole
        .from("profiles")
        .select("id")
        .eq("id", recipe.user_id)
        .eq("is_public", true)
        .maybeSingle();
      if (profileError) throw new Error(`Could not check source recipe owner visibility: ${profileError.message}`);
      if (profile) publicSourceRecipe = { id: recipe.id, name: recipe.name };
    }
  }

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
    from_vessel: "From",
    to_vessel: "To",
    volume: "Volume",
    gravity: "Gravity",
    agent: "Clarifying agent",
    amount: "Amount",
    unit: "Unit",
    contact_time: "Contact time",
    vessel: "Aging vessel / conditions",
    temperature: "Temperature (°C)",
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

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="mx-auto w-full max-w-4xl rounded-xl border border-white/10 bg-black/60 p-6 backdrop-blur-md sm:p-8">
        <PublicPageNavigation current="recipes" />
        <PageHeading title={batch.name || "Public batch"} subtitle="Public brewing batch" />
        <div className="mt-6">
          <ActiveBatchOverview
            batch={batch}
            secondary={["Sekundær", "secondary"].includes(batch.status)}
          />
          {batch.fg != null || batch.abv != null ? (
            <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {batch.fg != null && (
                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-white/50">Final gravity</dt>
                  <dd className="mt-1 font-semibold">{Number(batch.fg).toFixed(3)}</dd>
                </div>
              )}
              {batch.abv != null && (
                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-white/50">ABV</dt>
                  <dd className="mt-1 font-semibold">{Number(batch.abv).toFixed(1)}%</dd>
                </div>
              )}
            </dl>
          ) : null}
          <BatchRecipeCard batch={batch} showNotes={false} />
          {gravityReadings.length > 0 && (
            <section className="mb-5 mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-3 text-lg font-semibold text-green-300">Specific gravity readings</h3>
              <ul className="space-y-2 text-sm text-white/75">
                {[...gravityReadings].reverse().map((reading) => (
                  <li key={reading.id} className="flex justify-between gap-4">
                    <time dateTime={reading.created_at}>
                      {new Date(reading.created_at).toLocaleString()}
                    </time>
                    <span className="font-mono">{Number(reading.sg).toFixed(3)}</span>
                  </li>
                ))}
              </ul>
              {gravityReadings.length > 0 && (
                <p className="mt-3 text-sm font-semibold text-green-200">
                  Current estimated ABV:{" "}
                  {(
                    (Number(batch.og) -
                      Number(gravityReadings[gravityReadings.length - 1].sg)) *
                    131.25
                  ).toFixed(2)}
                  %
                </p>
              )}
            </section>
          )}
          {batch.secondary_startdate && (
            <section className="mb-5 mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-3 text-lg font-semibold text-green-300">Secondary fermentation</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-white/50">Racked on</p>
                  <p className="mt-1 font-medium">
                    {new Date(batch.secondary_startdate).toLocaleDateString("en-US")}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-4 sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-white/50">Additions</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-white/85">
                    {formatSecondaryAdditions(batch.secondary_additions) ||
                      "No secondary additions recorded."}
                  </p>
                </div>
                {batch.secondary_notes?.trim() && (
                  <div className="rounded-lg border border-white/10 bg-black/20 p-4 sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-white/50">Notes</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-white/85">
                      <PublicMentionText text={batch.secondary_notes} unitAware />
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
          {batch.conditioning_startdate && (
            <section className="mb-5 rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-3 text-lg font-semibold text-green-300">Conditioning</h3>
              <p className="text-sm text-white/85">
                Started {new Date(batch.conditioning_startdate).toLocaleDateString("en-US")}
              </p>
            </section>
          )}
          {conditioningEntries?.length ? (
            <section className="mb-5 mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-3 text-lg font-semibold text-green-300">Conditioning activity</h3>
              <ol className="space-y-3">
                {conditioningEntries.map((entry) => {
                  const details =
                    entry.details && typeof entry.details === "object"
                      ? (entry.details as Record<string, string>)
                      : {};
                  const detailRows = Object.entries(details).filter(
                    ([key, value]) => key !== "unit" && Boolean(value)
                  );
                  return (
                    <li key={entry.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <h4 className="font-semibold">
                          {conditioningEntryLabels[entry.entry_type] ?? "Conditioning action"}
                        </h4>
                        <time className="text-sm text-white/55" dateTime={entry.occurred_at}>
                          {new Date(entry.occurred_at).toLocaleString()}
                        </time>
                      </div>
                      {detailRows.length > 0 && (
                        <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                          {detailRows.map(([key, value]) => (
                            <div key={key}>
                              <dt className="text-xs text-white/50">
                                {conditioningDetailLabels[key] ?? key}
                              </dt>
                              <dd className="whitespace-pre-wrap text-white/85">
                                {key === "amount" && details.unit
                                  ? `${value} ${details.unit}`
                                  : key === "volume"
                                    ? `${value} L`
                                    : key === "wait_hours"
                                      ? `${value} hours`
                                      : key === "target_date"
                                        ? new Date(`${value}T12:00:00`).toLocaleDateString()
                                        : value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}
          {(batch.finished_date ||
            batch.packaged_at ||
            batch.packaged_volume_l != null ||
            batch.packaging_method ||
            batch.bottle_volume_l != null ||
            batch.keg_volume_l != null ||
            batch.package_count != null ||
            batch.carbonation_method ||
            batch.target_carbonation_volumes != null ||
            batch.priming_sugar_g != null) && (
            <section className="mb-5 mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-3 text-lg font-semibold text-green-300">Packaging</h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                {batch.finished_date && <div><dt className="text-xs uppercase text-white/50">Finished</dt><dd>{new Date(batch.finished_date).toLocaleDateString("en-US")}</dd></div>}
                {batch.packaged_at && <div><dt className="text-xs uppercase text-white/50">Packaged</dt><dd>{new Date(batch.packaged_at).toLocaleDateString("en-US")}</dd></div>}
                {batch.packaging_method && <div><dt className="text-xs uppercase text-white/50">Packaging method</dt><dd>{batch.packaging_method}</dd></div>}
                {batch.packaged_volume_l != null && <div><dt className="text-xs uppercase text-white/50">Packaged volume</dt><dd>{Number(batch.packaged_volume_l).toFixed(1)} L</dd></div>}
                {batch.bottle_volume_l != null && <div><dt className="text-xs uppercase text-white/50">Bottle size</dt><dd>{Number(batch.bottle_volume_l).toFixed(2)} L</dd></div>}
                {batch.keg_volume_l != null && <div><dt className="text-xs uppercase text-white/50">Keg size</dt><dd>{Number(batch.keg_volume_l).toFixed(1)} L</dd></div>}
                {batch.package_count != null && <div><dt className="text-xs uppercase text-white/50">Package count</dt><dd>{batch.package_count}</dd></div>}
                {batch.carbonation_method && <div><dt className="text-xs uppercase text-white/50">Carbonation</dt><dd>{batch.carbonation_method}</dd></div>}
                {batch.target_carbonation_volumes != null && <div><dt className="text-xs uppercase text-white/50">Target carbonation</dt><dd>{Number(batch.target_carbonation_volumes).toFixed(1)} volumes</dd></div>}
                {batch.priming_sugar_g != null && <div><dt className="text-xs uppercase text-white/50">Priming sugar</dt><dd>{Number(batch.priming_sugar_g).toFixed(0)} g</dd></div>}
              </dl>
            </section>
          )}
          {publicSourceRecipe && (
            <p className="mt-4 text-sm">
              Source recipe:{" "}
              <a
                href={`/public-recipes/${encodeURIComponent(publicSourceRecipe.id)}`}
                className="font-semibold text-green-200 underline underline-offset-4"
              >
                {publicSourceRecipe.name || "View public recipe"}
              </a>
            </p>
          )}
          <p className="mt-4 text-sm text-white/50">
            Created: {new Date(batch.created_at).toLocaleDateString("en-US")}
          </p>
        </div>
      </div>
    </main>
  );
}
