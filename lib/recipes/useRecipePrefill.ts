"use client";

import { useEffect, useState } from "react";

export type SavedRecipe = Record<string, any> & {
  id: string;
  type: string;
};

export function useRecipePrefill(recipeId?: string, expectedType?: string) {
  const [recipe, setRecipe] = useState<SavedRecipe | null>(null);
  const [loading, setLoading] = useState(Boolean(recipeId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!recipeId) {
      setRecipe(null);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    setRecipe(null);
    setLoading(true);
    setError("");

    fetch(`/api/recipes/${encodeURIComponent(recipeId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Could not load recipe.");
        }
        return result.recipe as SavedRecipe;
      })
      .then((loadedRecipe) => {
        const typeMatches =
          loadedRecipe.type?.toLowerCase() === expectedType?.toLowerCase();
        if (!typeMatches) {
          throw new Error("This recipe does not match the batch type.");
        }
        setRecipe(loadedRecipe);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name !== "AbortError") {
          setError(loadError.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [expectedType, recipeId]);

  return { recipe, loading, error };
}
