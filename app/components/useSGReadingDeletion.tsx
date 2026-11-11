"use client";

import { useState } from "react";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useTranslation } from "@/lib/i18n/useTranslation";

export type SGReading = {
  id: string;
  sg: number | string;
  created_at: string;
};

export function useSGReadingDeletion(
  batchId: string,
  onDeleted: (readingId: string) => void
) {
  const { t } = useTranslation();
  const [pendingReading, setPendingReading] = useState<SGReading | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function deleteReading() {
    if (!pendingReading) return false;

    try {
      const response = await fetch("/api/sg", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingReading.id, batchId }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error ||
            t("Could not delete the gravity reading. Please try again.")
        );
      }

      onDeleted(pendingReading.id);
      setDeleteError("");
      return true;
    } catch (error) {
      console.error("Could not delete SG reading", error);
      setDeleteError(t("Could not delete the gravity reading. Please try again."));
      return true;
    }
  }

  const dialog = (
    <ConfirmDialog
      open={pendingReading !== null}
      title={t("Delete gravity reading")}
      message={t(
        "Are you sure you want to delete this gravity reading? This action cannot be undone."
      )}
      confirmLabel={t("Delete")}
      cancelLabel={t("Cancel")}
      pendingLabel={t("Deleting…")}
      onConfirm={deleteReading}
      onCancel={() => setPendingReading(null)}
    />
  );

  function requestDeletion(reading: SGReading) {
    setDeleteError("");
    setPendingReading(reading);
  }

  return { requestDeletion, deleteError, dialog };
}
