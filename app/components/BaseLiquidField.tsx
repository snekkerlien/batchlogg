"use client";

import { UnitInput, UnitSymbol } from "./Units";
import FormField from "./FormField";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function BaseLiquidField({
  defaultName = "",
  defaultAmount = "",
}: {
  defaultName?: string;
  defaultAmount?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-start gap-2">
      <FormField
        id="recipe-base-liquid"
        label={<>{t("Base liquid")} (<UnitSymbol kind="volume" />)</>}
      >
        <input
          id="recipe-base-liquid"
          name="base_liquid"
          defaultValue={defaultName}
          placeholder={t("Water (leave empty for plain water)")}
          className="w-full min-w-0 rounded border border-white/20 bg-black/40 p-3 focus:border-green-400 focus:outline-none"
        />
      </FormField>
      <span className="mt-8 shrink-0 text-sm text-white/80">{t("up to")}</span>
      <FormField id="recipe-base-liquid-amount" label={t("Amount")}>
        <UnitInput
          id="recipe-base-liquid-amount"
          name="base_liquid_amount"
          kind="volume"
          defaultValue={defaultAmount}
          placeholder={t("Amount")}
          className="w-28 shrink-0 rounded border border-white/20 bg-black/40 p-3 focus:border-green-400 focus:outline-none"
        />
      </FormField>
    </div>
  );
}
