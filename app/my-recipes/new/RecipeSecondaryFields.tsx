"use client";

import { useState } from "react";
import FormField from "@/app/components/FormField";
import PublicMentionTextarea from "@/app/components/PublicMentionTextarea";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  parseSecondaryAdditions,
  type SecondaryAdditionItem,
} from "@/lib/recipes/secondaryAdditions";

function AdditionRows({
  label,
  rows,
  onChange,
}: {
  label: string;
  rows: SecondaryAdditionItem[];
  onChange: (rows: SecondaryAdditionItem[]) => void;
}) {
  const { t } = useTranslation();
  function update(index: number, changes: Partial<SecondaryAdditionItem>) {
    onChange(rows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...changes } : row
    ));
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(6rem,0.35fr)_minmax(5rem,0.25fr)_auto]">
          <input
            aria-label={`${t(label)} ${index + 1}`}
            placeholder={`${t(label)} ${t("name")}`}
            value={row.name}
            onChange={(event) => update(index, { name: event.target.value })}
            className="col-span-2 min-w-0 rounded border border-white/20 bg-black/40 p-3 sm:col-span-1"
          />
          <input
            aria-label={`${t(label)} ${index + 1} ${t("Amount")}`}
            placeholder={t("Amount")}
            type="number"
            min="0"
            step="any"
            value={row.amount}
            onChange={(event) => update(index, { amount: event.target.value })}
            className="min-w-0 rounded border border-white/20 bg-black/40 p-3"
          />
          <input
            aria-label={`${t(label)} ${index + 1} ${t("Unit")}`}
            placeholder={t("Unit")}
            value={row.unit}
            onChange={(event) => update(index, { unit: event.target.value })}
            className="min-w-0 rounded border border-white/20 bg-black/40 p-3"
          />
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
            className="col-span-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/20 sm:col-span-1"
          >
            {t("Remove")}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { name: "", amount: "", unit: "" }])}
        className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
      >
        + {t("Add")} {t(label === "Secondary additive" ? "additive" : "fruit")}
      </button>
    </div>
  );
}

export default function RecipeSecondaryFields({
  defaultValue = "",
  defaultNotes = "",
  defaultEnabled = false,
  showToggle = true,
  includeHadSecondaryField = true,
}: {
  defaultValue?: string | null;
  defaultNotes?: string | null;
  defaultEnabled?: boolean;
  showToggle?: boolean;
  includeHadSecondaryField?: boolean;
}) {
  const { t } = useTranslation();
  const [hadSecondary, setHadSecondary] = useState(defaultEnabled);
  const [additions, setAdditions] = useState(() => parseSecondaryAdditions(defaultValue));
  const [notes, setNotes] = useState(defaultNotes ?? "");
  const secondaryEnabled = showToggle ? hadSecondary : true;
  const secondaryAdditions = secondaryEnabled
    ? JSON.stringify({ ...additions, version: 1 })
    : "";

  return (
    <div className="flex flex-col gap-4">
      {showToggle && (
        <div>
          <label className="mb-2 block font-semibold">{t("Secondary fermentation")}</label>
          <button
            type="button"
            aria-pressed={hadSecondary}
            onClick={() => setHadSecondary((current) => !current)}
            className={`rounded-lg border px-4 py-2 ${
              hadSecondary
                ? "border-purple-500 bg-purple-700"
                : "border-white/20 bg-black/40"
            }`}
          >
            {hadSecondary ? t("Secondary enabled") : t("Enable secondary")}
          </button>
        </div>
      )}

      <input type="hidden" name="secondary_additions" value={secondaryAdditions} />
      {includeHadSecondaryField && (
        <input type="hidden" name="had_secondary" value={hadSecondary ? "true" : "false"} />
      )}
      {!secondaryEnabled && <input type="hidden" name="secondary_notes" value="" />}
      {secondaryEnabled && (
        <>
          <div>
            <label className="mb-1 block font-semibold">{t("Secondary additives")}</label>
            <AdditionRows
              label="Secondary additive"
              rows={additions.additives}
              onChange={(additives) => setAdditions((current) => ({ ...current, additives }))}
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold">{t("Secondary fruit additions")}</label>
            <AdditionRows
              label="Fruit"
              rows={additions.fruits}
              onChange={(fruits) => setAdditions((current) => ({ ...current, fruits }))}
            />
          </div>
          <FormField id="recipe-secondary-notes" label={t("Secondary notes")}>
            <PublicMentionTextarea
              id="recipe-secondary-notes"
              name="secondary_notes"
              placeholder={t("Notes about the secondary fermentation...")}
              rows={6}
              className="min-h-32 w-full resize-y rounded border border-white/20 bg-black/40 p-3"
              value={notes}
              onChange={setNotes}
            />
          </FormField>
        </>
      )}
    </div>
  );
}
