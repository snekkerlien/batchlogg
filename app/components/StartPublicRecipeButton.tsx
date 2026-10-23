"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/app/providers/AuthProvider";

export default function StartPublicRecipeButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const { user, loading } = useAuthContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/public-recipes/${encodeURIComponent(recipeId)}/start`, {
        method: "POST",
        credentials: "include",
      });
      if (response.status === 401) {
        router.push(`/auth/login?redirect=${encodeURIComponent(`/recipes?start=${recipeId}`)}`);
        return;
      }
      const result: { recipeId?: string; error?: string } = await response.json();
      if (!response.ok || !result.recipeId) {
        throw new Error(result.error || "Could not prepare this recipe for brewing.");
      }
      router.push(`/my-recipes?start=${encodeURIComponent(result.recipeId)}`);
    } catch (startError) {
      console.error("Could not start from public recipe", startError);
      setError(startError instanceof Error ? startError.message : "Could not prepare this recipe for brewing.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void start()}
        className="min-h-11 rounded-lg border border-green-400 bg-green-700 px-4 py-2 text-sm font-semibold hover:bg-green-600 disabled:opacity-50"
      >
        {busy ? "Preparing recipe…" : "Start a batch"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-amber-200">{error}</p>}
    </div>
  );
}
