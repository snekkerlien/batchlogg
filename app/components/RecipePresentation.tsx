import type { ReactNode } from "react";
import type { DryHop, Fruit, Hop, Ingredient, Malt } from "@/app/types/batchTypes";
import { Qty } from "@/app/components/Units";
import BeerColorGlass from "@/app/components/BeerColorGlass";
import BitternessMeter from "@/app/components/BitternessMeter";
import { formatSecondaryAdditions } from "@/lib/recipes/secondaryAdditions";

export type RecipePresentationData = {
  name?: string | null;
  type: string;
  og?: number | string | null;
  fg?: number | string | null;
  abv?: number | string | null;
  volume?: number | string | null;
  ibu?: number | string | null;
  ebc?: number | string | null;
  ingredients?: Ingredient[] | {
    beer_subtype?: string | null;
    kit_url?: string | null;
  } | null;
  malts?: Malt[] | null;
  hops?: Hop[] | null;
  dry_hops?: DryHop[] | null;
  boil_volume?: number | string | null;
  boil_time?: number | string | null;
  yeast?: string | null;
  honey_type?: string | null;
  honey_amount?: number | string | null;
  base_liquid?: string | null;
  base_liquid_amount?: number | string | null;
  fruits?: Fruit[] | null;
  juice_type?: string | null;
  sugar_amount?: number | string | null;
  steps?: string[] | null;
  additives?: string | null;
  full_process?: string | null;
  notes?: string | null;
  had_secondary?: boolean | null;
  secondary_additions?: string | null;
  secondary_notes?: string | null;
};

function RecipeSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
      <h2 className="mb-4 border-b border-white/10 pb-3 text-lg font-semibold text-green-300">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-white/85">{children}</div>
    </section>
  );
}

function RecipeMetric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-white">{children}</dd>
    </div>
  );
}

function hasEntries<T>(items: T[] | null | undefined): items is T[] {
  return Boolean(items?.length);
}

function isBeerIngredients(
  ingredients: RecipePresentationData["ingredients"]
): ingredients is { beer_subtype?: string | null; kit_url?: string | null } {
  return Boolean(
    ingredients &&
    !Array.isArray(ingredients) &&
    (Object.prototype.hasOwnProperty.call(ingredients, "beer_subtype") ||
      Object.prototype.hasOwnProperty.call(ingredients, "kit_url"))
  );
}

export default function RecipePresentation({
  recipe,
  linkTabIndex,
}: {
  recipe: RecipePresentationData;
  linkTabIndex?: number;
}) {
  const beerIngredients = recipe.type === "Beer" && isBeerIngredients(recipe.ingredients)
    ? recipe.ingredients
    : null;
  const beerStyle = beerIngredients?.beer_subtype === "fresh_wort_kit"
    ? "Fresh wort kit"
    : beerIngredients?.beer_subtype === "malt_extract_kit"
      ? "Malt extract kit"
      : "All-grain";
  const hasSecondaryDetails = Boolean(
    recipe.had_secondary || recipe.secondary_additions?.trim() || recipe.secondary_notes?.trim()
  );

  const renderMalts = () => recipe.malts?.map((malt, i) => (
    <li key={i} className="flex justify-between gap-4 px-3 py-2">
      <span>
        {malt.name}
        {malt.ebc != null && <span className="text-white/55"> · {Number(malt.ebc).toFixed(0)} EBC</span>}
      </span>
      <span className="shrink-0 font-medium"><Qty kind="kg" value={malt.amount} /></span>
    </li>
  ));

  const renderHops = () => recipe.hops?.map((hop, i) => (
    <li key={i} className="flex justify-between gap-4 rounded-lg bg-black/20 px-3 py-2">
      <span>
        <strong>{hop.name}</strong>
        <span className="block text-white/60">
          {hop.addition_type === "whirlpool"
            ? `Whirlpool · ${hop.time} min at ${hop.temperature}°C`
            : `${hop.time} min boil`}
          {hop.alpha != null && ` · ${Number(hop.alpha)}% alpha`}
          {hop.year != null && ` · ${hop.year}`}
        </span>
      </span>
      <span className="shrink-0 font-medium"><Qty kind="g" value={hop.amount} maxDecimals={0} /></span>
    </li>
  ));

  return (
    <div>
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        <span className="rounded-full border border-green-300/30 bg-green-300/10 px-3 py-1 text-sm font-medium text-green-200">
          {recipe.type}
        </span>
        {recipe.type === "Beer" && (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/70">
            {beerStyle}
          </span>
        )}
      </div>

      <section className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-green-300">Recipe at a glance</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {recipe.og != null && <RecipeMetric label="Original gravity">{Number(recipe.og).toFixed(3)}</RecipeMetric>}
          {recipe.fg != null && <RecipeMetric label="Final gravity">{Number(recipe.fg).toFixed(3)}</RecipeMetric>}
          {recipe.abv != null && <RecipeMetric label="ABV">{Number(recipe.abv).toFixed(1)}%</RecipeMetric>}
          {recipe.volume != null && <RecipeMetric label="Batch volume"><Qty kind="volume" value={recipe.volume} /></RecipeMetric>}
          {(recipe.type === "Beer" || recipe.type === "Braggot") && recipe.ibu != null && (
            <RecipeMetric label="Bitterness">
              <BitternessMeter ibu={Number(recipe.ibu)} />
            </RecipeMetric>
          )}
          {(recipe.type === "Beer" || recipe.type === "Braggot") && recipe.ebc != null && (
            <RecipeMetric label="Color">
              <span className="flex items-center gap-3">
                <BeerColorGlass ebc={Number(recipe.ebc)} />
                <span>{Number(recipe.ebc).toFixed(0)} EBC</span>
              </span>
            </RecipeMetric>
          )}
        </dl>
        {(recipe.type === "Beer" || recipe.type === "Braggot") && recipe.ibu != null && (
          <p className="mt-3 text-xs text-white/45">
            Bitterness is a guide; sweetness and style affect perception.
          </p>
        )}
      </section>

      <div className="space-y-5">
        {recipe.type === "Beer" && (
          <RecipeSection title="Grain & hop schedule">
            {beerIngredients?.kit_url && (
              <p>
                <strong>Kit:</strong>{" "}
                <a href={beerIngredients.kit_url} target="_blank" rel="noreferrer" tabIndex={linkTabIndex} className="text-green-300 underline">
                  Open kit
                </a>
              </p>
            )}
            {recipe.boil_volume != null && <p><strong>Boil volume:</strong> <Qty kind="volume" value={recipe.boil_volume} /></p>}
            {hasEntries(recipe.malts) && (
              <div>
                <h3 className="mb-2 font-semibold text-white">Malts</h3>
                <ul className="divide-y divide-white/10 rounded-lg border border-white/10">{renderMalts()}</ul>
              </div>
            )}
            {hasEntries(recipe.hops) && (
              <div>
                <h3 className="mb-2 font-semibold text-white">Boil & whirlpool hops</h3>
                <ol className="space-y-2">{renderHops()}</ol>
              </div>
            )}
            {hasEntries(recipe.dry_hops) && (
              <div>
                <h3 className="mb-2 font-semibold text-white">Dry hops</h3>
                <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
                  {recipe.dry_hops.map((hop, i) => (
                    <li key={i} className="flex justify-between gap-4 px-3 py-2">
                      <span>
                        {hop.name}
                        <span className="block text-white/60">
                          {hop.contact} days contact
                          {hop.alpha != null && ` · ${Number(hop.alpha)}% alpha`}
                          {hop.year != null && ` · ${hop.year}`}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium"><Qty kind="g" value={hop.amount} maxDecimals={0} /></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {recipe.boil_time != null && <p><strong>Total boil time:</strong> {recipe.boil_time} min</p>}
            {recipe.yeast && <p><strong>Yeast:</strong> {recipe.yeast}</p>}
          </RecipeSection>
        )}

        {recipe.type === "Braggot" && (
          <RecipeSection title="Malt, hops & honey">
            {hasEntries(recipe.malts) && (
              <div>
                <h3 className="mb-2 font-semibold text-white">Malts</h3>
                <ul className="divide-y divide-white/10 rounded-lg border border-white/10">{renderMalts()}</ul>
              </div>
            )}
            {hasEntries(recipe.hops) && (
              <div>
                <h3 className="mb-2 font-semibold text-white">Hop schedule</h3>
                <ul className="space-y-2">{renderHops()}</ul>
              </div>
            )}
            {(recipe.honey_type || recipe.honey_amount != null) && (
              <p>
                <strong>Honey:</strong> {recipe.honey_type ?? "Unspecified"}
                {recipe.honey_amount != null && <> · <Qty kind="kg" value={recipe.honey_amount} /></>}
              </p>
            )}
            {recipe.boil_time != null && <p><strong>Boil time:</strong> {recipe.boil_time} min</p>}
            {recipe.yeast && <p><strong>Yeast:</strong> {recipe.yeast}</p>}
          </RecipeSection>
        )}

        {recipe.type === "Mead" && (
          <RecipeSection title="Honey & fruit">
            {(recipe.base_liquid || recipe.base_liquid_amount != null) && (
              <p>
                <strong>Base liquid:</strong> {recipe.base_liquid || "Water"}
                {recipe.base_liquid_amount != null && <> · up to <Qty kind="volume" value={recipe.base_liquid_amount} /></>}
              </p>
            )}
            {(recipe.honey_type || recipe.honey_amount != null) && (
              <p>
                <strong>Honey:</strong> {recipe.honey_type ?? "Unspecified"}
                {recipe.honey_amount != null && <> · <Qty kind="kg" value={recipe.honey_amount} /></>}
              </p>
            )}
            {hasEntries(recipe.fruits) && (
              <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
                {recipe.fruits.map((fruit, i) => (
                  <li key={i} className="flex justify-between gap-4 px-3 py-2">
                    <span>{fruit.name}</span><span className="shrink-0 font-medium">{fruit.amount} {fruit.unit}</span>
                  </li>
                ))}
              </ul>
            )}
            {recipe.yeast && <p><strong>Yeast:</strong> {recipe.yeast}</p>}
          </RecipeSection>
        )}

        {(recipe.type === "Cider" || recipe.type === "Wine" || recipe.type === "Seltzer") && (
          <RecipeSection title={recipe.type === "Wine" ? "Must & additions" : "Juice & additions"}>
            {recipe.juice_type && <p><strong>{recipe.type === "Wine" ? "Must / juice" : "Juice"}:</strong> {recipe.juice_type}</p>}
            {recipe.sugar_amount != null && <p><strong>Sugar added:</strong> <Qty kind="kg" value={recipe.sugar_amount} /></p>}
            {recipe.yeast && <p><strong>Yeast:</strong> {recipe.yeast}</p>}
          </RecipeSection>
        )}

        {recipe.type === "Other" && (
          <RecipeSection title="Ingredients & fermentation">
            {Array.isArray(recipe.ingredients) && hasEntries(recipe.ingredients) && (
              <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
                {recipe.ingredients.map((ingredient, i) => (
                  <li key={i} className="flex justify-between gap-4 px-3 py-2">
                    <span>{ingredient.name}</span><span className="shrink-0 font-medium">{ingredient.amount} {ingredient.unit}</span>
                  </li>
                ))}
              </ul>
            )}
            {recipe.yeast && <p><strong>Yeast:</strong> {recipe.yeast}</p>}
          </RecipeSection>
        )}

        {hasEntries(recipe.steps) && (
          <RecipeSection title="Process">
            <ol className="space-y-3">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-300/15 text-xs font-semibold text-green-200">{i + 1}</span>
                  <span className="whitespace-pre-line">{step}</span>
                </li>
              ))}
            </ol>
          </RecipeSection>
        )}

        {recipe.full_process && <RecipeSection title="Brewing method"><p className="whitespace-pre-line">{recipe.full_process}</p></RecipeSection>}
        {recipe.additives && <RecipeSection title="Additives"><p className="whitespace-pre-line">{recipe.additives}</p></RecipeSection>}

        {hasSecondaryDetails && (
          <RecipeSection title="Secondary fermentation">
            {recipe.secondary_additions?.trim() ? (
              <p className="whitespace-pre-line">{formatSecondaryAdditions(recipe.secondary_additions)}</p>
            ) : recipe.had_secondary ? (
              <p>This recipe includes a secondary fermentation.</p>
            ) : null}
            {recipe.secondary_notes?.trim() && <p className="whitespace-pre-line text-white/65">{recipe.secondary_notes}</p>}
          </RecipeSection>
        )}

        {recipe.notes && <RecipeSection title="Brewer’s notes"><p className="whitespace-pre-line">{recipe.notes}</p></RecipeSection>}
      </div>
    </div>
  );
}
