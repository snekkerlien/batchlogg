"use client";

import type { ReactNode } from "react";
import type { Batch } from "@/app/types/batchTypes";
import { Qty, UnitAwareText } from "@/app/components/Units";

function brewTypeLabel(batch: Batch): string {
  if (batch.type !== "Beer") return batch.type;

  const subtypeLabels: Record<string, string> = {
    all_grain: "All-grain",
    fresh_wort_kit: "Fresh wort kit",
    malt_extract_kit: "Malt extract kit",
  };
  return `Beer${batch.beer_subtype ? ` — ${subtypeLabels[batch.beer_subtype] ?? batch.beer_subtype}` : ""}`;
}

function hasText(value: string | null | undefined): value is string {
  return Boolean(value?.trim());
}

function RecipeSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-black/15 p-4">
      <h4 className="mb-3 border-b border-white/10 pb-2 font-semibold text-green-300">{title}</h4>
      <div className="space-y-3 text-sm leading-relaxed text-white/85">{children}</div>
    </section>
  );
}

export default function BatchRecipeCard({ batch }: { batch: Batch }) {
  const isBeerOrBraggot = batch.type === "Beer" || batch.type === "Braggot";
  const isWineCiderOrSeltzer =
    batch.type === "Wine" || batch.type === "Cider" || batch.type === "Seltzer";
  const hasBeerDetails = Boolean(
    batch.kit_url || batch.malts?.length || batch.hops?.length || batch.dry_hops?.length ||
    batch.boil_time != null || batch.boil_volume_l != null || (batch.type === "Beer" && hasText(batch.yeast)) ||
    (batch.type === "Braggot" && (hasText(batch.honey_type) || batch.honey_amount != null))
  );
  const hasMeadDetails = Boolean(
    (batch.base_liquid || batch.base_liquid_amount != null) ||
    (batch.type === "Mead" && (hasText(batch.yeast) || batch.fruits?.length)) ||
    ((batch.type === "Mead" || batch.type === "Braggot") &&
      (hasText(batch.honey_type) || batch.honey_amount != null))
  );
  const hasJuiceDetails = Boolean(
    isWineCiderOrSeltzer &&
    (hasText(batch.juice_type) || batch.sugar_amount != null || hasText(batch.yeast))
  );
  const hasOtherDetails = Boolean(
    batch.type === "Other" &&
    (batch.ingredients?.length || batch.steps?.length || hasText(batch.yeast))
  );

  return (
    <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-green-300">Recipe</h3>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/70">
            {brewTypeLabel(batch)}
          </span>
          {batch.type === "Beer" && batch.beer_style && (
            <span className="rounded-full border border-green-300/30 bg-green-300/10 px-3 py-1 text-sm text-green-100">
              {batch.beer_style}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {isBeerOrBraggot && hasBeerDetails && (
          <RecipeSection title={batch.type === "Beer" ? "Grain & hop schedule" : "Malt, hops & honey"}>
            {batch.type === "Beer" && batch.kit_url && (
              <p>
                <strong>Kit:</strong>{" "}
                <a href={batch.kit_url} target="_blank" rel="noreferrer" className="text-green-300 underline">
                  Open kit
                </a>
              </p>
            )}
            {batch.malts && batch.malts.length > 0 && (
              <div>
                <h5 className="mb-2 font-medium text-white">Malts</h5>
                <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
                  {batch.malts.map((malt, index) => (
                    <li key={`${malt.name}-${index}`} className="flex justify-between gap-4 px-3 py-2">
                      <span>
                        {malt.name}
                        {malt.ebc != null && <span className="text-white/55"> · {Number(malt.ebc).toFixed(0)} EBC</span>}
                      </span>
                      <span className="shrink-0 font-medium"><Qty kind="kg" value={malt.amount} /></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {batch.hops && batch.hops.length > 0 && (
              <div>
                <h5 className="mb-2 font-medium text-white">Boil & whirlpool hops</h5>
                <ul className="space-y-2">
                  {batch.hops.map((hop, index) => (
                    <li key={`${hop.name}-${index}`} className="flex justify-between gap-4 rounded-lg bg-white/[0.04] px-3 py-2">
                      <span>
                        <strong>{hop.name}</strong>
                        <span className="block text-white/60">
                          {hop.addition_type === "whirlpool"
                            ? `Whirlpool · ${hop.time} min${hop.temperature != null ? ` at ${hop.temperature}°C` : ""}`
                            : `${hop.time} min boil`}
                          {hop.alpha != null && ` · ${hop.alpha}% alpha acid${hop.year ? ` · ${hop.year} crop` : ""}`}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium"><Qty kind="g" value={hop.amount} maxDecimals={0} /></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {batch.type === "Beer" && batch.dry_hops && batch.dry_hops.length > 0 && (
              <div>
                <h5 className="mb-2 font-medium text-white">Dry hops</h5>
                <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
                  {batch.dry_hops.map((hop, index) => (
                    <li key={`${hop.name}-${index}`} className="flex justify-between gap-4 px-3 py-2">
                      <span>
                        {hop.name}
                        <span className="block text-white/60">
                          {hop.contact ? `${hop.contact} days contact` : "Contact time not specified"}
                          {hop.alpha != null && ` · ${hop.alpha}% alpha acid${hop.year ? ` · ${hop.year} crop` : ""}`}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium"><Qty kind="g" value={hop.amount} maxDecimals={0} /></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(batch.type === "Braggot" && (hasText(batch.honey_type) || batch.honey_amount != null)) && (
              <p>
                <strong>Honey:</strong> {batch.honey_type || "Unspecified"}
                {batch.honey_amount != null && <> · <Qty kind="kg" value={batch.honey_amount} /></>}
              </p>
            )}
            {batch.boil_volume_l != null && (
              <p><strong>Boil volume:</strong> <Qty kind="volume" value={batch.boil_volume_l} /></p>
            )}
            {batch.boil_time != null && <p><strong>Total boil time:</strong> {batch.boil_time} min</p>}
            {batch.type === "Beer" && hasText(batch.yeast) && <p><strong>Yeast:</strong> {batch.yeast}</p>}
          </RecipeSection>
        )}

        {batch.type === "Mead" && hasMeadDetails && (
          <RecipeSection title="Honey & fruit">
            {(batch.base_liquid || batch.base_liquid_amount != null) && (
              <p>
                <strong>Base liquid:</strong> {batch.base_liquid || "Water"}
                {batch.base_liquid_amount != null && <> · up to <Qty kind="volume" value={batch.base_liquid_amount} /></>}
              </p>
            )}
            {(hasText(batch.honey_type) || batch.honey_amount != null) && (
              <p>
                <strong>Honey:</strong> {batch.honey_type || "Unspecified"}
                {batch.honey_amount != null && <> · <Qty kind="kg" value={batch.honey_amount} /></>}
              </p>
            )}
            {batch.fruits && batch.fruits.length > 0 && (
              <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
                {batch.fruits.map((fruit, index) => (
                  <li key={`${fruit.name}-${index}`} className="flex justify-between gap-4 px-3 py-2">
                    <span>{fruit.name}</span>
                    <span className="shrink-0 font-medium">{fruit.amount} {fruit.unit}</span>
                  </li>
                ))}
              </ul>
            )}
            {hasText(batch.yeast) && <p><strong>Yeast:</strong> {batch.yeast}</p>}
          </RecipeSection>
        )}

        {hasJuiceDetails && (
          <RecipeSection title={batch.type === "Wine" ? "Must & additions" : "Juice & additions"}>
            {hasText(batch.juice_type) && <p><strong>{batch.type === "Wine" ? "Must / juice" : "Juice"}:</strong> {batch.juice_type}</p>}
            {batch.sugar_amount != null && <p><strong>Sugar added:</strong> <Qty kind="kg" value={batch.sugar_amount} /></p>}
            {hasText(batch.yeast) && <p><strong>Yeast:</strong> {batch.yeast}</p>}
          </RecipeSection>
        )}

        {hasOtherDetails && (
          <RecipeSection title="Ingredients & fermentation">
            {batch.ingredients && batch.ingredients.length > 0 && (
              <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
                {batch.ingredients.map((ingredient, index) => (
                  <li key={`${ingredient.name}-${index}`} className="flex justify-between gap-4 px-3 py-2">
                    <span>{ingredient.name}</span>
                    <span className="shrink-0 font-medium">{ingredient.amount} {ingredient.unit}</span>
                  </li>
                ))}
              </ul>
            )}
            {batch.steps && batch.steps.length > 0 && (
              <ol className="space-y-2">
                {batch.steps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-300/15 text-xs font-semibold text-green-200">
                      {index + 1}
                    </span>
                    <span className="whitespace-pre-line">{step}</span>
                  </li>
                ))}
              </ol>
            )}
            {hasText(batch.yeast) && <p><strong>Yeast:</strong> {batch.yeast}</p>}
          </RecipeSection>
        )}

        {hasText(batch.additives) && (
          <RecipeSection title="Additives"><p className="whitespace-pre-line"><UnitAwareText text={batch.additives} /></p></RecipeSection>
        )}
        {hasText(batch.full_process) && (
          <RecipeSection title="Brewing method"><p className="whitespace-pre-line"><UnitAwareText text={batch.full_process} /></p></RecipeSection>
        )}
        {hasText(batch.notes) && (
          <RecipeSection title="Brewer’s notes"><p className="whitespace-pre-line"><UnitAwareText text={batch.notes} /></p></RecipeSection>
        )}
      </div>
    </div>
  );
}
