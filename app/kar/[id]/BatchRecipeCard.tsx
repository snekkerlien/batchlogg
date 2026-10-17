"use client";

import type { Batch } from "@/app/types/batchTypes";
import { Qty } from "@/app/components/Units";

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

export default function BatchRecipeCard({ batch }: { batch: Batch }) {
  const isBeerOrBraggot = batch.type === "Beer" || batch.type === "Braggot";
  const isWineCiderOrSeltzer =
    batch.type === "Wine" || batch.type === "Cider" || batch.type === "Seltzer";

  return (
    <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-xl font-bold text-green-300">
        Recipe <span className="text-base font-semibold">· {brewTypeLabel(batch)}</span>
      </h3>
      <div className="space-y-3 whitespace-pre-wrap text-sm">
        {batch.type === "Beer" && batch.kit_url && (
          <p>
            <strong>Kit link:</strong>{" "}
            <a
              href={batch.kit_url}
              target="_blank"
              rel="noreferrer"
              className="text-green-300 underline"
            >
              Open kit
            </a>
          </p>
        )}

        {batch.type === "Mead" && (batch.base_liquid || batch.base_liquid_amount != null) && (
          <p>
            <strong>Base liquid:</strong> {batch.base_liquid || "Water"}
            {batch.base_liquid_amount != null && (
              <> up to <Qty kind="volume" value={batch.base_liquid_amount} /></>
            )}
          </p>
        )}

        {(batch.type === "Mead" || batch.type === "Braggot") &&
          (hasText(batch.honey_type) || batch.honey_amount != null) && (
            <p>
              <strong>Honey:</strong>
              {hasText(batch.honey_type) ? ` ${batch.honey_type}` : ""}
              {batch.honey_amount != null && (
                <> — <Qty kind="kg" value={batch.honey_amount} /></>
              )}
            </p>
          )}

        {batch.type === "Mead" && batch.fruits && batch.fruits.length > 0 && (
          <div>
            <strong>Fruits:</strong>
            {batch.fruits.map((fruit, index) => (
              <p key={`${fruit.name}-${index}`}>
                {fruit.name}: {fruit.amount} {fruit.unit}
              </p>
            ))}
          </div>
        )}

        {isWineCiderOrSeltzer && hasText(batch.juice_type) && (
          <p><strong>Juice type:</strong> {batch.juice_type}</p>
        )}
        {isWineCiderOrSeltzer && batch.sugar_amount != null && (
          <p><strong>Sugar added:</strong> <Qty kind="kg" value={batch.sugar_amount} /></p>
        )}

        {isBeerOrBraggot && batch.malts && batch.malts.length > 0 && (
          <div>
            <strong>Malt additions:</strong>
            {batch.malts.map((malt, index) => (
              <p key={`${malt.name}-${index}`}>
                {malt.name}: <Qty kind="kg" value={malt.amount} />
                {malt.ebc != null && ` (${malt.ebc} EBC)`}
              </p>
            ))}
          </div>
        )}

        {isBeerOrBraggot && batch.hops && batch.hops.length > 0 && (
          <div>
            <strong>Hop schedule:</strong>
            {batch.hops.map((hop, index) => (
              <p key={`${hop.name}-${index}`}>
                {hop.name}: <Qty kind="g" value={hop.amount} maxDecimals={0} /> @{" "}
                {hop.addition_type === "whirlpool"
                  ? `whirlpool ${hop.time} min${hop.temperature != null ? ` at ${hop.temperature}°C` : ""}`
                  : `${hop.time} min boil`}
                {hop.alpha != null && ` (${hop.alpha}% alpha acid${hop.year ? `, ${hop.year} crop` : ""})`}
              </p>
            ))}
          </div>
        )}

        {batch.type === "Beer" && batch.dry_hops && batch.dry_hops.length > 0 && (
          <div>
            <strong>Dry hop additions:</strong>
            {batch.dry_hops.map((hop, index) => (
              <p key={`${hop.name}-${index}`}>
                {hop.name}: <Qty kind="g" value={hop.amount} maxDecimals={0} />
                {hop.contact ? ` for ${hop.contact} days` : ""}
                {hop.alpha != null && ` (${hop.alpha}% alpha acid${hop.year ? `, ${hop.year} crop` : ""})`}
              </p>
            ))}
          </div>
        )}

        {isBeerOrBraggot && batch.boil_time != null && (
          <p><strong>Total boil time:</strong> {batch.boil_time} min</p>
        )}
        {batch.type === "Beer" && batch.boil_volume_l != null && (
          <p><strong>Boil volume:</strong> <Qty kind="volume" value={batch.boil_volume_l} /></p>
        )}
        {hasText(batch.yeast) && <p><strong>Yeast:</strong> {batch.yeast}</p>}

        {batch.type === "Other" && batch.ingredients && batch.ingredients.length > 0 && (
          <div>
            <strong>Ingredients:</strong>
            {batch.ingredients.map((ingredient, index) => (
              <p key={`${ingredient.name}-${index}`}>
                {ingredient.name}: {ingredient.amount} {ingredient.unit}
              </p>
            ))}
          </div>
        )}
        {batch.type === "Other" && batch.steps && batch.steps.length > 0 && (
          <div>
            <strong>Process steps:</strong>
            {batch.steps.map((step, index) => <p key={index}>{index + 1}. {step}</p>)}
          </div>
        )}

        {hasText(batch.additives) && <p className="whitespace-pre-line"><strong>Additives:</strong><br />{batch.additives}</p>}
        {hasText(batch.full_process) && <p><strong>Full process:</strong><br />{batch.full_process}</p>}
        {hasText(batch.notes) && <p><strong>Notes:</strong><br />{batch.notes}</p>}
      </div>
    </div>
  );
}
