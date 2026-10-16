"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAdminUser } from "./actions";
import ConfirmDialog from "@/app/components/ConfirmDialog";

export default function DeleteUserButton({
  userId,
  username,
  redirectTo = "/admin/users",
}: {
  userId: string;
  username: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (pending) return false;

    setPending(true);
    setError(null);
    try {
      await deleteAdminUser(userId);
      router.push(redirectTo);
      router.refresh();
      return true;
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete user",
      );
      return false;
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-10 max-w-md border-t border-red-400/30 pt-6">
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        className="rounded-lg bg-red-700 px-4 py-3 font-semibold hover:bg-red-800 disabled:cursor-wait disabled:opacity-50"
      >
        {pending ? "Deleting user..." : "Delete User"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${username}?`}
        message={`Permanently delete ${username} and all of their data? This also removes their Supabase Auth account and cannot be undone.`}
        confirmLabel="Delete user"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
