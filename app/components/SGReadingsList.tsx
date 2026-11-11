"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  type SGReading,
  useSGReadingDeletion,
} from "@/app/components/useSGReadingDeletion";

export default function SGReadingsList({
  batchId,
  readings,
  onDeleted,
}: {
  batchId: string;
  readings: SGReading[];
  onDeleted: (readingId: string) => void;
}) {
  const { t, language } = useTranslation();
  const { requestDeletion, deleteError, dialog } =
    useSGReadingDeletion(batchId, onDeleted);

  return (
    <>
      {deleteError && (
        <p role="alert" className="mb-3 text-sm text-red-300">
          {deleteError}
        </p>
      )}
      <ul className="space-y-2 text-sm text-white/75">
        {readings.map((reading) => (
          <li
            key={reading.id}
            className="group flex flex-wrap items-center justify-between gap-3"
          >
            <time dateTime={reading.created_at}>
              {new Date(reading.created_at).toLocaleString(
                language === "nb" ? "nb-NO" : "en-GB"
              )}
            </time>
            <span className="font-mono">{Number(reading.sg).toFixed(3)}</span>
            <button
              type="button"
              onClick={() => requestDeletion(reading)}
              className="rounded-lg border border-red-300/30 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-400/10 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300"
            >
              {t("Delete")}
            </button>
          </li>
        ))}
      </ul>
      {dialog}
    </>
  );
}
