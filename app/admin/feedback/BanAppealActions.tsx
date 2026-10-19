"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/ConfirmDialog";

export default function BanAppealActions({
  feedbackId,
}: {
  feedbackId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"dismiss" | "grant" | null>(null);
  const [grantConfirmationOpen, setGrantConfirmationOpen] = useState(false);
  const [error, setError] = useState("");

  async function resolveAppeal(action: "dismiss" | "grant"): Promise<boolean> {
    if (busy) return false;
    setBusy(action);
    setError("");
    try {
      const response = await fetch("/api/admin/feedback/ban-appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ feedbackId, action }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not resolve ban appeal.");
      router.refresh();
      return true;
    } catch (resolveError) {
      console.error("Could not resolve ban appeal", resolveError);
      setError(
        resolveError instanceof Error
          ? resolveError.message
          : "Could not resolve ban appeal."
      );
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-3 text-sm">
        <button
          type="button"
          onClick={() => setGrantConfirmationOpen(true)}
          disabled={busy !== null}
          className="rounded-lg border border-green-400/40 bg-green-500/10 px-3 py-2 font-semibold text-green-300 hover:bg-green-500/20 disabled:cursor-wait disabled:opacity-50"
        >
          {busy === "grant" ? "Granting…" : "Grant appeal and unban"}
        </button>
        <button
          type="button"
          onClick={() => void resolveAppeal("dismiss")}
          disabled={busy !== null}
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 font-semibold hover:bg-white/20 disabled:cursor-wait disabled:opacity-50"
        >
          {busy === "dismiss" ? "Dismissing…" : "Dismiss appeal"}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      <ConfirmDialog
        open={grantConfirmationOpen}
        title="Grant ban appeal?"
        message="This will remove the user's active ban and remove the appeal from the feedback inbox."
        confirmLabel="Grant appeal and unban"
        onConfirm={() => resolveAppeal("grant")}
        onCancel={() => setGrantConfirmationOpen(false)}
      />
    </div>
  );
}
