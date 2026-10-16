"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/ConfirmDialog";

export default function DeleteRoadmapEntryButton({
  id,
}: {
  id: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteEntry() {
    if (deleting) return false;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/roadmap/update", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete roadmap entry.");
      router.refresh();
      return true;
    } catch (deleteError) {
      console.error("Could not delete completed roadmap entry", deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete roadmap entry."
      );
      return false;
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="rounded border border-red-400/30 bg-red-900/20 px-2 py-1 text-xs text-red-200 hover:bg-red-900/40"
      >
        Delete
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
      <ConfirmDialog
        open={open}
        title="Delete completed roadmap entry?"
        message="This permanently removes the completed entry from the roadmap."
        confirmLabel="Delete entry"
        onConfirm={deleteEntry}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
