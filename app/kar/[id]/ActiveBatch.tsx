"use client";

import { Qty } from "@/app/components/Units";
import { useTranslation } from "@/lib/i18n/useTranslation";

type ActiveBatchProps = {
  karId: string;
  batch: {
    id: string;
    batchnummer: string;
    name: string;
    volume_l: number;
    startdato: string;
    og: number;
    oppskrift: string;
    status: string;
    created_at: string;
    user_id: string;
  };
};

export function ActiveBatch({ karId, batch }: ActiveBatchProps) {
  const { t } = useTranslation();
  return (
    <div className="p-4 bg-green-900/40 rounded-lg border border-green-600 text-white space-y-2">
      <h2 className="text-xl font-bold">{t("Active batch")}</h2>

      <p><strong>{t("Batch ID")}:</strong> {batch.batchnummer}</p>
      <p><strong>{t("Name")}:</strong> {batch.name}</p>
      <p><strong>{t("Volume")}:</strong> <Qty kind="volume" value={batch.volume_l} /></p>
      <p><strong>{t("Brew date")}:</strong> {batch.startdato}</p>
      <p><strong>{t("Original Gravity (OG)")}:</strong> {batch.og}</p>

      <p className="whitespace-pre-wrap">
        <strong>{t("Recipe")}:</strong>{"\n"}
        {batch.oppskrift}
      </p>
    </div>
  );
}
