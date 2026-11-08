"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitRecipe } from "../submitRecipe";
import MenuOverlay from "../../MenuOverlay";
import BackButton from "../../BackButton";
import FormField from "@/app/components/FormField";
import PublicMentionTextarea from "@/app/components/PublicMentionTextarea";
import { UnitInput, UnitSymbol } from "../../../components/Units";
import RecipeAdditiveFields from "../RecipeAdditiveFields";
import RecipeSecondaryFields from "../RecipeSecondaryFields";
import { useTranslation } from "@/lib/i18n/useTranslation";
import RecipeCreationError from "../RecipeCreationError";

export default function NewWineRecipePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setWarnings([]);
    setError("");

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const result = await submitRecipe(formData);

    if (result?.success === false) {
      setWarnings(result.maltWarnings ?? []);
      setError(result.error ?? (result.maltWarnings?.length ? "" : "Could not save the recipe."));
      setLoading(false);
      return;
    }

    if (result?.success === true) {
      router.push("/my-recipes");
      return;
    }
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10">

        {/* MENU BUTTON */}
        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay />
        </div>

        {/* BACK BUTTON */}
        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <BackButton />
        </div>

        {/* HEADER */}
        <h1 className="text-4xl font-bold mb-2 text-center">{t("New Wine Recipe")}</h1>
        <p className="text-center opacity-80 mb-10">
          {t("Fill out the details below to create a new wine recipe.")}
        </p>

        {/* WARNINGS */}
        <RecipeCreationError error={error} />
        {warnings.length > 0 && (
          <div className="bg-red-600 text-white p-4 rounded-md mb-6">
            <strong>{t("Validation warnings:")}</strong>
            <ul className="mt-2 list-disc list-inside">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          aria-busy={loading}
          className="flex flex-col gap-6"
        >
          <input type="hidden" name="type" value="Wine" />

          {/* Recipe name */}
          <FormField id="recipe-name" label={t("Recipe name")} required>
            <input
              id="recipe-name"
              name="name"
              placeholder={t("Example: Cabernet Sauvignon")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
              required
            />
          </FormField>

          {/* Volume */}
          <FormField id="recipe-volume" label={<>{t("Volume")} (<UnitSymbol kind="volume" />)</>}>
            <UnitInput
              id="recipe-volume"
              name="volume"
              kind="volume"
              placeholder={t("Example: 20")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* OG */}
          <FormField id="recipe-og" label={t("Original Gravity (OG)")}>
            <input
              id="recipe-og"
              name="og"
              type="number"
              step="0.001"
              placeholder={t("Example: 1.090")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* FG */}
          <FormField id="recipe-fg" label={t("Final Gravity (FG)")}>
            <input
              id="recipe-fg"
              name="fg"
              type="number"
              step="0.001"
              placeholder={t("Example: 1.010")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* Grape / Juice type */}
          <FormField id="recipe-juice-type" label={t("Grape / Juice type")}>
            <input
              id="recipe-juice-type"
              name="juice_type"
              placeholder={t("Example: Cabernet Sauvignon grapes or 100% grape juice")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* Sugar (optional) */}
          <FormField id="recipe-sugar" label={<>{t("Sugar added (optional)")} (<UnitSymbol kind="kg" />)</>}>
            <UnitInput
              id="recipe-sugar"
              name="sugar_amount"
              kind="kg"
              placeholder={t("Example: 1.5 kg")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* Yeast */}
          <FormField id="recipe-yeast" label={t("Yeast strain")}>
            <input
              id="recipe-yeast"
              name="yeast"
              placeholder={t("Example: EC-1118, BM4x4, QA23")}
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </FormField>

          {/* Additives */}
          <div>
            <label className="block mb-1 font-semibold">{t("Additives")}</label>
            <RecipeAdditiveFields />
          </div>
          {/* Full process */}
          <FormField id="recipe-process" label={t("Full process")}>
            <PublicMentionTextarea
              id="recipe-process"
              name="full_process"
              placeholder={t("Crushing, maceration, punch-downs, temperature...")}
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-40"
            />
          </FormField>

          {/* Notes */}
          <FormField id="recipe-notes" label={t("Notes")}>
            <PublicMentionTextarea
              id="recipe-notes"
              name="notes"
              placeholder={t("Any additional notes about the recipe...")}
              className="w-full p-3 rounded bg-black/40 border border-white/20 h-32"
            />
          </FormField>
          <RecipeSecondaryFields />

          {/* Submit */}
          <button
            disabled={loading}
            className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold"
          >
            {loading ? t("Saving...") : t("Save recipe")}
          </button>
        </form>
      </div>
    </main>
  );
}
