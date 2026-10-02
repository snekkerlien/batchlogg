"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAdminUser } from "./actions";

export default function DeleteUserButton({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (pending) return;

    const confirmed = window.confirm(
      `Permanently delete ${username} and all of their data? This also removes their Supabase Auth account and cannot be undone.`,
    );
    if (!confirmed) return;

    setPending(true);
    setError(null);
    try {
      await deleteAdminUser(userId);
      router.push("/admin/users");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete user",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-10 max-w-md border-t border-red-400/30 pt-6">
      <button
        type="button"
        onClick={handleDelete}
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
    </div>
  );
}
