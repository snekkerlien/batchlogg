"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/ConfirmDialog";

export default function ClearCompletedButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function clearCompleted() {
    setError("");
    try {
      const response = await fetch("/api/admin/roadmap/clear-completed", {
        method: "DELETE",
        credentials: "include",
      });
      const data: { error?: string; deleted?: boolean } = await response.json();
      if (data.deleted) {
        setNotice(data.error || "The entries were deleted, but the action could not be added to the audit log.");
        router.refresh();
        return true;
      }
      if (!response.ok) throw new Error(data.error || "Could not clear completed roadmap entries.");
      router.refresh();
      return true;
    } catch (clearError) {
      console.error("Could not clear completed roadmap entries", clearError);
      setError(
        clearError instanceof Error
          ? clearError.message
          : "Could not clear completed roadmap entries."
      );
      return false;
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setError("");
          setNotice("");
          setOpen(true);
        }}
        className="rounded border border-red-400/30 bg-red-900/20 px-2 py-1 text-xs text-red-200 hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Clear completed
      </button>
      {notice && <p role="alert" className="text-xs text-red-300">{notice}</p>}
      <ConfirmDialog
        open={open}
        title="Clear completed roadmap entries?"
        message={error || "This permanently removes all completed entries from the roadmap."}
        confirmLabel="Clear completed"
        pendingLabel="Clearing…"
        onConfirm={clearCompleted}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
