"use client";

import Link from "next/link";
import { UnitSymbol } from "@/app/components/Units";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function BatchEntryGuide({
  vesselId,
  recipeName,
}: {
  vesselId: string;
  recipeName?: string | null;
}) {
  const { t } = useTranslation();

  return (
    <aside className="mb-6 rounded-xl border border-green-300/20 bg-green-300/[0.05] p-4">
      <h2 className="font-semibold text-green-200">{t("A few quick pointers")}</h2>
      <ul className="mt-2 space-y-2 text-sm text-white/75">
        <li>
          <strong>{t("Volume")}:</strong>{" "}
          {t("Enter the total batch volume in the unit shown, for example 10 ")}
          <UnitSymbol kind="volume" />.
        </li>
        <li>
          <strong>{t("Original Gravity (OG)")}:</strong>{" "}
          {t("Record the specific gravity before fermentation begins, for example 1.050. Your recipe may have a different target.")}
        </li>
        <li>
          <strong>{t("Start date")}:</strong>{" "}
          {t("Choose the date you brewed or began fermenting this batch. Change it if you started earlier than today.")}
        </li>
      </ul>
      {recipeName && (
        <p className="mt-3 text-sm text-green-100">
          {t("Starting from ")}<strong>{recipeName}</strong>
          {t("? Its saved recipe details are prefilled and can still be edited.")}
        </p>
      )}
      <p className="mt-3 text-sm text-white/75">
        {t("Have a saved recipe?")}{" "}
        <Link
          href={`/my-recipes?vessel=${encodeURIComponent(vesselId)}`}
          className="font-semibold text-green-200 underline underline-offset-4"
        >
          {t("Start from a saved recipe")}
        </Link>
        {" "}{t("to prefill its details for this vessel.")}
      </p>
    </aside>
  );
}
