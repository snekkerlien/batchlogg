"use client";

import { useEffect, useState } from "react";

export default function BatchOutcomeSharing({
  batchId,
  batchType,
  hasSourceRecipe,
  initiallyShared,
  initiallySharingTastingNotes,
}: {
  batchId: string;
  batchType: string;
  hasSourceRecipe: boolean;
  initiallyShared: boolean;
  initiallySharingTastingNotes: boolean;
}) {
  const [shared, setShared] = useState(initiallyShared);
  const [recipeLinked, setRecipeLinked] = useState(hasSourceRecipe);
  const [linkedFromBatchRecipe, setLinkedFromBatchRecipe] = useState(false);
  const [sharingTastingNotes, setSharingTastingNotes] = useState(
    initiallySharingTastingNotes
  );
  const [saving, setSaving] = useState(false);
  const [recipes, setRecipes] = useState<
    { id: string; name: string | null; type: string | null }[]
  >([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [loadingRecipes, setLoadingRecipes] = useState(!hasSourceRecipe);
  const [linkingRecipe, setLinkingRecipe] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (recipeLinked) return;
    let active = true;
    void fetch(`/api/batches/${encodeURIComponent(batchId)}/recipe`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        const result: {
          savedFromBatch?: {
            id: string;
            name: string | null;
            type: string | null;
          };
          recipes?: { id: string; name: string | null; type: string | null }[];
          error?: string;
        } = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Could not load matching recipes.");
        }
        if (result.savedFromBatch) {
          const linkResponse = await fetch(
            `/api/batches/${encodeURIComponent(batchId)}/recipe`,
            {
              method: "PATCH",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recipeId: result.savedFromBatch.id }),
            }
          );
          const linkResult: { error?: string } = await linkResponse.json();
          if (!linkResponse.ok) {
            throw new Error(
              linkResult.error || "Could not link the recipe saved from this batch."
            );
          }
          if (active) {
            setRecipeLinked(true);
            setLinkedFromBatchRecipe(true);
          }
        } else if (active) {
          setRecipes(result.recipes ?? []);
        }
      })
      .catch((loadError: unknown) => {
        console.error("Could not load recipes for batch linking", loadError);
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load matching recipes."
          );
        }
      })
      .finally(() => {
        if (active) setLoadingRecipes(false);
      });

    return () => {
      active = false;
    };
  }, [batchId, recipeLinked]);

  async function updateSharing(nextShared: boolean, nextTastingNotes: boolean) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/batches/${encodeURIComponent(batchId)}/sharing`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shareOutcomePublicly: nextShared,
            shareTastingNotesPublicly: nextTastingNotes,
          }),
        }
      );
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not update outcome sharing.");
      }
      setShared(nextShared);
      setSharingTastingNotes(nextTastingNotes);
    } catch (updateError) {
      console.error("Could not update batch outcome sharing", updateError);
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update outcome sharing."
      );
    } finally {
      setSaving(false);
    }
  }

  async function linkRecipe() {
    if (!selectedRecipeId) {
      setError("Choose a recipe to link to this batch.");
      return;
    }
    setLinkingRecipe(true);
    setError("");
    try {
      const response = await fetch(
        `/api/batches/${encodeURIComponent(batchId)}/recipe`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipeId: selectedRecipeId }),
        }
      );
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not link the recipe.");
      }
      setRecipeLinked(true);
      setLinkedFromBatchRecipe(false);
    } catch (linkError) {
      console.error("Could not link recipe to batch", linkError);
      setError(
        linkError instanceof Error
          ? linkError.message
          : "Could not link the recipe."
      );
    } finally {
      setLinkingRecipe(false);
    }
  }

  return (
    <fieldset className="mt-4 space-y-3 rounded-lg border border-white/10 bg-black/20 p-4">
      <legend className="px-2 font-semibold text-green-300">
        Community result
      </legend>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={shared}
          disabled={saving || !recipeLinked}
          onChange={(event) =>
            void updateSharing(
              event.target.checked,
              event.target.checked && sharingTastingNotes
            )
          }
          className="mt-1"
        />
        <span>
          Share this batch outcome publicly with your username
          <span className="mt-1 block text-xs text-white/55">
            Results appear on the public source recipe. Your recipe and profile
            must both be public. You can turn sharing off at any time.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-white/80">
        <input
          type="checkbox"
          checked={sharingTastingNotes}
          disabled={saving || !shared}
          onChange={(event) =>
            void updateSharing(shared, event.target.checked)
          }
          className="mt-1"
        />
        <span>
          Include my tasting notes
          <span className="mt-1 block text-xs text-white/55">
            Tasting notes stay private unless you separately opt in here.
          </span>
        </span>
      </label>
      {!recipeLinked && (
        <div className="space-y-2">
          <label
            htmlFor={`batch-recipe-${batchId}`}
            className="block text-xs font-medium text-white/65"
          >
            Link a {batchType} recipe to this batch
          </label>
          <div className="flex flex-wrap gap-2">
            <select
              id={`batch-recipe-${batchId}`}
              value={selectedRecipeId}
              disabled={loadingRecipes || linkingRecipe || recipes.length === 0}
              onChange={(event) => setSelectedRecipeId(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-white/20 bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              <option value="">
                {loadingRecipes
                  ? "Loading recipes…"
                  : recipes.length > 0
                    ? "Choose a recipe"
                    : "No matching recipes"}
              </option>
              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name || "Unnamed recipe"}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={linkingRecipe || !selectedRecipeId}
              onClick={() => void linkRecipe()}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {linkingRecipe ? "Linking…" : "Link recipe"}
            </button>
          </div>
          {recipes.length === 0 && !loadingRecipes && (
            <p className="text-xs text-white/55">
              Save a {batchType} recipe first. You can then link it here and
              share the batch result.
            </p>
          )}
        </div>
      )}
      {recipeLinked && !hasSourceRecipe && (
        <p role="status" className="text-xs text-green-200">
          {linkedFromBatchRecipe
            ? "The recipe saved from this batch was linked automatically. You can now share this result."
            : "Recipe linked. You can now share this batch result."}
        </p>
      )}
      {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
      {saving && <p role="status" className="text-xs text-white/55">Saving sharing preference…</p>}
    </fieldset>
  );
}
