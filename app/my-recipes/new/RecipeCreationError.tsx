"use client";

import { translateRecipeError } from "@/lib/i18n/apiErrors";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function RecipeCreationError({ error }: { error: string }) {
  const { t } = useTranslation();
  return error ? (
    <p role="alert" className="mb-6 rounded border border-red-400/40 bg-red-950/50 p-3 text-red-200">
      {translateRecipeError(error, t)}
    </p>
  ) : null;
}
