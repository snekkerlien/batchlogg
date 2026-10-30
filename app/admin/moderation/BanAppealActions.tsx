"use client";

import { useState } from "react";
import ConfirmDialog from "@/app/components/ConfirmDialog";

type AppealAction = "request_info" | "dismiss" | "grant";
type AppealStatus = "pending" | "info_requested" | "granted" | "dismissed";

export default function BanAppealActions({
  userId,
  status,
  onUpdated,
}: {
  userId: string;
  status: AppealStatus;
  onUpdated: () => void;
}) {
  const [busy, setBusy] = useState<AppealAction | null>(null);
  const [grantConfirmationOpen, setGrantConfirmationOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [error, setError] = useState("");

  async function resolveAppeal(action: AppealAction): Promise<boolean> {
    if (busy) return false;
    setBusy(action);
    setError("");
    try {
      const response = await fetch("/api/admin/moderation/ban-appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appealUserId: userId,
          action,
          message: action === "request_info" ? requestMessage : undefined,
        }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update ban appeal.");
      setRequestMessage("");
      setGrantConfirmationOpen(false);
      onUpdated();
      return true;
    } catch (resolveError) {
      console.error("Could not update ban appeal", resolveError);
      setError(
        resolveError instanceof Error
          ? resolveError.message
          : "Could not update ban appeal."
      );
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (status === "granted" || status === "dismissed") {
    return (
      <p className="mt-4 text-sm font-semibold text-white/65">
        Appeal {status}.
      </p>
    );
  }

  return (
    <div className="mt-5">
      {status === "pending" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void resolveAppeal("request_info");
          }}
          className="mb-4 space-y-2"
        >
          <label htmlFor={`appeal-request-${userId}`} className="block text-sm font-semibold">
            Request more information
          </label>
          <textarea
            id={`appeal-request-${userId}`}
            value={requestMessage}
            onChange={(event) => setRequestMessage(event.target.value)}
            minLength={3}
            maxLength={3000}
            required
            rows={3}
            className="w-full rounded-lg border border-white/20 bg-black/40 p-3 text-sm"
          />
          <button
            type="submit"
            disabled={busy !== null}
            className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
          >
            {busy === "request_info" ? "Requesting…" : "Ask user for more information"}
          </button>
        </form>
      )}
      {status === "info_requested" && (
        <p className="mb-4 text-sm text-amber-100/80">
          Waiting for the user to reply before another request can be sent.
        </p>
      )}
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
        message="This will remove the user's active ban and mark the appeal as granted."
        confirmLabel="Grant appeal and unban"
        onConfirm={() => resolveAppeal("grant")}
        onCancel={() => setGrantConfirmationOpen(false)}
      />
    </div>
  );
}
