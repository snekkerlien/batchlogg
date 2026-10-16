"use client";

import { useState } from "react";
import BaseLiquidField from "@/app/components/BaseLiquidField";
import { UnitInput, UnitSymbol, useUnits } from "@/app/components/Units";
import {
  BatchEditAdditiveFields,
  BatchEditFruitFields,
} from "./BatchEditAdditionFields";

type MaltRow = {
  name: string;
  amount: string;
  unit: string;
  ebc: string;
};

type HopRow = {
  name: string;
  amount: string;
  unit: string;
  time: string;
  alpha: string;
  year: string;
  addition_type: "boil" | "whirlpool";
  temperature: string;
};

type DryHopRow = {
  name: string;
  amount: string;
  contact: string;
  alpha: string;
  year: string;
};

type IngredientRow = {
  name: string;
  amount: string;
  unit: string;
};

type BatchEditRecord = {
  type: string;
  beer_subtype?: string | null;
  kit_url?: string | null;
  ibu?: number | string | null;
  ebc?: number | string | null;
  volume_l?: number | string | null;
  boil_volume_l?: number | string | null;
  boil_time?: number | string | null;
  malts?: Array<Partial<MaltRow>> | null;
  hops?: Array<
    Partial<HopRow> & { boil?: string | number | null }
  > | null;
  dry_hops?: Array<Partial<DryHopRow>> | null;
  honey_type?: string | null;
  honey_amount?: number | string | null;
  base_liquid?: string | null;
  base_liquid_amount?: number | string | null;
  fruits?: IngredientRow[] | null;
  juice_type?: string | null;
  sugar_amount?: number | string | null;
  yeast?: string | null;
  ingredients?: IngredientRow[] | null;
  steps?: string[] | null;
  additives?: string | null;
  full_process?: string | null;
  notes?: string | null;
};

const inputClass = "w-full min-w-0 rounded border border-white/20 bg-black/40 p-3";
const rowClass =
  "grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(6rem,0.7fr)_minmax(5rem,0.5fr)_auto]";

function valueOrEmpty(value: string | number | null | undefined): string {
  return value == null ? "" : String(value);
}

export default function BatchEditTypeFields({
  batch,
}: {
  batch: BatchEditRecord;
}) {
  const { label } = useUnits();
  const [malts, setMalts] = useState<MaltRow[]>(
    () =>
      batch.malts?.map((malt) => ({
        name: malt.name ?? "",
        amount: valueOrEmpty(malt.amount),
        unit: malt.unit ?? "kg",
        ebc: valueOrEmpty(malt.ebc),
      })) ?? []
  );
  const [hops, setHops] = useState<HopRow[]>(
    () =>
      batch.hops?.map((hop) => ({
        name: hop.name ?? "",
        amount: valueOrEmpty(hop.amount),
        unit: hop.unit ?? "g",
        time: valueOrEmpty(hop.time ?? hop.boil),
        alpha: valueOrEmpty(hop.alpha),
        year: valueOrEmpty(hop.year),
        addition_type: hop.addition_type === "whirlpool" ? "whirlpool" : "boil",
        temperature: valueOrEmpty(hop.temperature),
      })) ?? []
  );
  const [dryHops, setDryHops] = useState<DryHopRow[]>(
    () =>
      batch.dry_hops?.map((hop) => ({
        name: hop.name ?? "",
        amount: valueOrEmpty(hop.amount),
        contact: valueOrEmpty(hop.contact),
        alpha: valueOrEmpty(hop.alpha),
        year: valueOrEmpty(hop.year),
      })) ?? []
  );
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    () =>
      batch.ingredients?.map((ingredient) => ({
        name: ingredient.name ?? "",
        amount: valueOrEmpty(ingredient.amount),
        unit: ingredient.unit ?? "",
      })) ?? []
  );
  const [steps, setSteps] = useState<string[]>(() => batch.steps ?? []);
  const [beerSubtype, setBeerSubtype] = useState(
    batch.beer_subtype ?? "all_grain"
  );

  function updateMalt(index: number, changes: Partial<MaltRow>) {
    setMalts((current) =>
      current.map((malt, rowIndex) =>
        rowIndex === index ? { ...malt, ...changes } : malt
      )
    );
  }

  function updateHop(index: number, changes: Partial<HopRow>) {
    setHops((current) =>
      current.map((hop, rowIndex) =>
        rowIndex === index ? { ...hop, ...changes } : hop
      )
    );
  }

  function updateDryHop(index: number, changes: Partial<DryHopRow>) {
    setDryHops((current) =>
      current.map((hop, rowIndex) =>
        rowIndex === index ? { ...hop, ...changes } : hop
      )
    );
  }

  function updateIngredient(index: number, changes: Partial<IngredientRow>) {
    setIngredients((current) =>
      current.map((ingredient, rowIndex) =>
        rowIndex === index ? { ...ingredient, ...changes } : ingredient
      )
    );
  }

  const isBeer = batch.type === "Beer";
  const isBraggot = batch.type === "Braggot";
  const isAllGrain = isBeer && beerSubtype === "all_grain";

  return (
    <>
      {isBeer && (
        <>
          <div>
            <label className="mb-1 block font-semibold">Recipe style</label>
            <select
              name="beer_subtype"
              value={beerSubtype}
              onChange={(event) => setBeerSubtype(event.target.value)}
              className={inputClass}
            >
              <option value="all_grain">All-grain</option>
              <option value="fresh_wort_kit">Fresh wort kit</option>
              <option value="malt_extract_kit">Malt extract kit</option>
            </select>
          </div>
          {beerSubtype !== "all_grain" && (
            <div>
              <label className="mb-1 block font-semibold">Kit link</label>
              <input
                name="kit_url"
                type="url"
                defaultValue={batch.kit_url ?? ""}
                placeholder="https://example.com/kit"
                className={inputClass}
              />
            </div>
          )}
        </>
      )}

      {(isBeer || isBraggot) && (
        <>
          <input
            type="hidden"
            name="malts_json"
            value={JSON.stringify(isBeer && !isAllGrain ? [] : malts)}
          />
          <input
            type="hidden"
            name="hops_json"
            value={JSON.stringify(isBeer && !isAllGrain ? [] : hops)}
          />
          {isBeer && beerSubtype === "fresh_wort_kit" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block font-semibold">
                IBU (from kit)
                <input
                  name="ibu"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={
                    batch.beer_subtype === "fresh_wort_kit"
                      ? valueOrEmpty(batch.ibu)
                      : ""
                  }
                  required
                  className={`${inputClass} mt-1 font-normal`}
                />
              </label>
              <label className="block font-semibold">
                EBC (from kit)
                <input
                  name="ebc"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={
                    batch.beer_subtype === "fresh_wort_kit"
                      ? valueOrEmpty(batch.ebc)
                      : ""
                  }
                  required
                  className={`${inputClass} mt-1 font-normal`}
                />
              </label>
            </div>
          )}
          {isBeer && (
            <input
              type="hidden"
              name="dry_hops_json"
              value={JSON.stringify(dryHops)}
            />
          )}

          {(!isBeer || isAllGrain) && (
            <>
              {isBeer && (
                <div>
                  <label className="mb-1 block font-semibold">
                    Boil volume (<UnitSymbol kind="volume" />)
                  </label>
                  <UnitInput
                    name="boil_volume_l"
                    kind="volume"
                    defaultValue={valueOrEmpty(
                      batch.boil_volume_l ?? batch.volume_l
                    )}
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block font-semibold">Malt additions</label>
                <div className="space-y-3">
                  {malts.map((malt, index) => (
                    <div key={index} className={rowClass}>
                      <input
                        aria-label={`Malt ${index + 1} name`}
                        placeholder="Malt type"
                        value={malt.name}
                        onChange={(event) =>
                          updateMalt(index, { name: event.target.value })
                        }
                        className={`${inputClass} col-span-2 sm:col-span-1`}
                      />
                      <UnitInput
                        kind="kg"
                        value={malt.amount}
                        onValueChange={(amount) => updateMalt(index, { amount })}
                        placeholder={`Amount (${label("kg")})`}
                        className={inputClass}
                      />
                      <input
                        aria-label={`Malt ${index + 1} EBC`}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="EBC"
                        value={malt.ebc}
                        onChange={(event) =>
                          updateMalt(index, { ebc: event.target.value })
                        }
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setMalts((current) =>
                            current.filter((_, rowIndex) => rowIndex !== index)
                          )
                        }
                        className="col-span-2 rounded border border-white/20 bg-white/10 px-3 py-2 sm:col-span-1"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setMalts((current) => [
                      ...current,
                      { name: "", amount: "", unit: "kg", ebc: "" },
                    ])
                  }
                  className="mt-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm"
                >
                  + Add malt
                </button>
              </div>

              <div>
                <label className="mb-2 block font-semibold">Hop additions</label>
                <div className="space-y-3">
                  {hops.map((hop, index) => (
                    <div key={index} className="space-y-2">
                      <input
                        aria-label={`Hop ${index + 1} name`}
                        placeholder="Hop type"
                        value={hop.name}
                        onChange={(event) =>
                          updateHop(index, { name: event.target.value })
                        }
                        className={inputClass}
                      />
                      <select
                        aria-label={`Hop ${index + 1} addition type`}
                        value={hop.addition_type}
                        onChange={(event) =>
                          updateHop(index, {
                            addition_type: event.target.value as "boil" | "whirlpool",
                          })
                        }
                        className={inputClass}
                      >
                        <option value="boil">Boil addition</option>
                        <option value="whirlpool">Whirlpool / hop stand</option>
                      </select>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(5rem,0.6fr)_minmax(5rem,0.6fr)_minmax(6rem,0.8fr)_minmax(6rem,0.8fr)_minmax(6rem,0.8fr)_auto]">
                        <input
                          aria-label={`Hop ${index + 1} alpha acid percentage`}
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          placeholder="Alpha (%)"
                          value={hop.alpha}
                          onChange={(event) =>
                            updateHop(index, { alpha: event.target.value })
                          }
                          className={inputClass}
                        />
                        <input
                          aria-label={`Hop ${index + 1} crop year`}
                          type="number"
                          min="1900"
                          step="1"
                          placeholder="Year"
                          value={hop.year}
                          onChange={(event) =>
                            updateHop(index, { year: event.target.value })
                          }
                          className={inputClass}
                        />
                        <UnitInput
                          kind="g"
                          value={hop.amount}
                          onValueChange={(amount) => updateHop(index, { amount })}
                          placeholder={`Amount (${label("g")})`}
                          className={inputClass}
                        />
                        <input
                          aria-label={`Hop ${index + 1} boil time in minutes`}
                          type="number"
                          min="0"
                          step="any"
                          required={Boolean(
                            hop.name.trim() || hop.amount.trim() || hop.alpha.trim()
                          )}
                          placeholder={
                            hop.addition_type === "whirlpool"
                              ? "Stand (min)"
                              : "Boil (min)"
                          }
                          value={hop.time}
                          onChange={(event) =>
                            updateHop(index, { time: event.target.value })
                          }
                          className={inputClass}
                        />
                        {hop.addition_type === "whirlpool" && (
                          <input
                            aria-label={`Hop ${index + 1} whirlpool temperature in Celsius`}
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            required={Boolean(
                              hop.name.trim() || hop.amount.trim() || hop.alpha.trim()
                            )}
                            placeholder="Temp (°C)"
                            value={hop.temperature}
                            onChange={(event) =>
                              updateHop(index, { temperature: event.target.value })
                            }
                            className={inputClass}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setHops((current) =>
                              current.filter((_, rowIndex) => rowIndex !== index)
                            )
                          }
                          className="col-span-2 rounded border border-white/20 bg-white/10 px-3 py-2 sm:col-span-1"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setHops((current) => [
                      ...current,
                      {
                        name: "",
                        amount: "",
                        unit: "g",
                        time: "",
                        alpha: "",
                        year: "",
                        addition_type: "boil",
                        temperature: "",
                      },
                    ])
                  }
                  className="mt-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm"
                >
                  + Add hop
                </button>
                <p className="mt-2 text-sm text-white/65">
                  Whirlpool IBU is estimated from the hop-stand duration and
                  temperature. The estimate is zero below 60°C.
                </p>
              </div>

              <div>
                <label className="mb-1 block font-semibold">
                  {isBeer ? "Total boil time" : "Boil time"} (minutes)
                </label>
                <input
                  name="boil_time"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={valueOrEmpty(batch.boil_time)}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {isBeer && (
            <div>
              <label className="mb-2 block font-semibold">Dry hop additions</label>
              <div className="space-y-3">
                {dryHops.map((hop, index) => (
                  <div key={index} className="space-y-2">
                    <input
                      aria-label={`Dry hop ${index + 1} name`}
                      placeholder="Hop type"
                      value={hop.name}
                      onChange={(event) =>
                        updateDryHop(index, { name: event.target.value })
                      }
                      className={inputClass}
                    />
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(5rem,0.6fr)_minmax(5rem,0.6fr)_minmax(6rem,0.8fr)_minmax(6rem,0.8fr)_auto]">
                      <input
                        aria-label={`Dry hop ${index + 1} alpha acid percentage`}
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        placeholder="Alpha (%)"
                        value={hop.alpha}
                        onChange={(event) =>
                          updateDryHop(index, { alpha: event.target.value })
                        }
                        className={inputClass}
                      />
                      <input
                        aria-label={`Dry hop ${index + 1} crop year`}
                        type="number"
                        min="1900"
                        step="1"
                        placeholder="Year"
                        value={hop.year}
                        onChange={(event) =>
                          updateDryHop(index, { year: event.target.value })
                        }
                        className={inputClass}
                      />
                      <UnitInput
                        kind="g"
                        value={hop.amount}
                        onValueChange={(amount) =>
                          updateDryHop(index, { amount })
                        }
                        placeholder={`Amount (${label("g")})`}
                        className={inputClass}
                      />
                      <input
                        aria-label={`Dry hop ${index + 1} contact time in days`}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Days"
                        value={hop.contact}
                        onChange={(event) =>
                          updateDryHop(index, { contact: event.target.value })
                        }
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDryHops((current) =>
                            current.filter((_, rowIndex) => rowIndex !== index)
                          )
                        }
                        className="col-span-2 rounded border border-white/20 bg-white/10 px-3 py-2 sm:col-span-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setDryHops((current) => [
                    ...current,
                    { name: "", amount: "", contact: "", alpha: "", year: "" },
                  ])
                }
                className="mt-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm"
              >
                + Add dry hop
              </button>
            </div>
          )}
        </>
      )}

      {isBraggot && (
        <>
          <div>
            <label className="mb-1 block font-semibold">Honey type</label>
            <input
              name="honey_type"
              defaultValue={batch.honey_type ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold">
              Honey amount (<UnitSymbol kind="kg" />)
            </label>
            <UnitInput
              name="honey_amount"
              kind="kg"
              defaultValue={valueOrEmpty(batch.honey_amount)}
              className={inputClass}
            />
          </div>
        </>
      )}

      {batch.type === "Mead" && (
        <>
          <BaseLiquidField
            defaultName={batch.base_liquid ?? ""}
            defaultAmount={valueOrEmpty(batch.base_liquid_amount)}
          />
          <div>
            <label className="mb-1 block font-semibold">Honey type</label>
            <input
              name="honey_type"
              defaultValue={batch.honey_type ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold">
              Honey amount (<UnitSymbol kind="kg" />)
            </label>
            <UnitInput
              name="honey_amount"
              kind="kg"
              defaultValue={valueOrEmpty(batch.honey_amount)}
              className={inputClass}
            />
          </div>
          <BatchEditFruitFields defaultValue={batch.fruits ?? []} />
        </>
      )}

      {(batch.type === "Wine" || batch.type === "Cider") && (
        <div>
          <label className="mb-1 block font-semibold">Juice type</label>
          <input
            name="juice_type"
            defaultValue={batch.juice_type ?? ""}
            className={inputClass}
          />
        </div>
      )}

      {(batch.type === "Wine" ||
        batch.type === "Cider" ||
        batch.type === "Seltzer") && (
        <div>
          <label className="mb-1 block font-semibold">
            Sugar amount (<UnitSymbol kind="kg" />)
          </label>
          <UnitInput
            name="sugar_amount"
            kind="kg"
            defaultValue={valueOrEmpty(batch.sugar_amount)}
            className={inputClass}
          />
        </div>
      )}

      {batch.type === "Other" && (
        <>
          <input
            type="hidden"
            name="ingredients_json"
            value={JSON.stringify(ingredients)}
          />
          <div>
            <label className="mb-2 block font-semibold">Ingredients</label>
            <div className="space-y-2">
              {ingredients.map((ingredient, index) => (
                <div key={index} className={rowClass}>
                  <input
                    aria-label={`Ingredient ${index + 1} name`}
                    placeholder="Ingredient"
                    value={ingredient.name}
                    onChange={(event) =>
                      updateIngredient(index, { name: event.target.value })
                    }
                    className={`${inputClass} col-span-2 sm:col-span-1`}
                  />
                  <input
                    aria-label={`Ingredient ${index + 1} amount`}
                    placeholder="Amount"
                    value={ingredient.amount}
                    onChange={(event) =>
                      updateIngredient(index, { amount: event.target.value })
                    }
                    className={inputClass}
                  />
                  <input
                    aria-label={`Ingredient ${index + 1} unit`}
                    placeholder="Unit"
                    value={ingredient.unit}
                    onChange={(event) =>
                      updateIngredient(index, { unit: event.target.value })
                    }
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setIngredients((current) =>
                        current.filter((_, rowIndex) => rowIndex !== index)
                      )
                    }
                    className="col-span-2 rounded border border-white/20 bg-white/10 px-3 py-2 sm:col-span-1"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setIngredients((current) => [
                  ...current,
                  { name: "", amount: "", unit: "" },
                ])
              }
              className="mt-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm"
            >
              + Add ingredient
            </button>
          </div>

          <input
            type="hidden"
            name="steps_json"
            value={JSON.stringify(steps)}
          />
          <div>
            <label className="mb-2 block font-semibold">Process steps</label>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-2">
                  <textarea
                    aria-label={`Process step ${index + 1}`}
                    placeholder={`Step ${index + 1}`}
                    value={step}
                    onChange={(event) =>
                      setSteps((current) =>
                        current.map((value, rowIndex) =>
                          rowIndex === index ? event.target.value : value
                        )
                      )
                    }
                    className={`${inputClass} min-h-20`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSteps((current) =>
                        current.filter((_, rowIndex) => rowIndex !== index)
                      )
                    }
                    className="rounded border border-white/20 bg-white/10 px-3 py-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSteps((current) => [...current, ""])}
              className="mt-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm"
            >
              + Add step
            </button>
          </div>
        </>
      )}

      {batch.type !== "Other" && (
        <div>
          <label className="mb-1 block font-semibold">Yeast strain</label>
          <input
            name="yeast"
            defaultValue={batch.yeast ?? ""}
            className={inputClass}
          />
        </div>
      )}
      <BatchEditAdditiveFields defaultValue={batch.additives ?? ""} />
      {batch.type !== "Other" && (
        <div>
          <label className="mb-1 block font-semibold">Full process</label>
          <textarea
            name="full_process"
            defaultValue={batch.full_process ?? ""}
            className={`${inputClass} min-h-32`}
          />
        </div>
      )}
      <div>
        <label className="mb-1 block font-semibold">Notes</label>
        <textarea
          name="notes"
          defaultValue={batch.notes ?? ""}
          className={`${inputClass} min-h-24`}
        />
      </div>
    </>
  );
}
