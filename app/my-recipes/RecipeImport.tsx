"use client";

import { useRef, useState } from "react";

type ImportedRecipe = {
  id: string;
  name: string;
  type: string;
  [key: string]: unknown;
};

export default function RecipeImport({
  onImported,
  disabled = false,
}: {
  onImported: (recipes: ImportedRecipe[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function importFile() {
    const file = inputRef.current?.files?.[0];
    setError("");
    setMessage("");
    if (!file) {
      setError("Choose a CSV, BeerXML, or BeerJSON file first.");
      return;
    }

    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/recipes/import", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        error?: string;
        recipes?: ImportedRecipe[];
      };
      if (!response.ok) throw new Error(result.error || "Could not import recipes.");
      const imported = result.recipes ?? [];
      onImported(imported);
      setMessage(
        `Imported ${imported.length} ${imported.length === 1 ? "recipe" : "recipes"}.`
      );
      if (inputRef.current) inputRef.current.value = "";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not import recipes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto mb-6 max-w-xl rounded-xl border border-white/15 bg-white/[0.04]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="recipe-import-content"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="w-full rounded-xl px-4 py-3 text-center text-sm font-semibold hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <span />
          <span>Import a recipe</span>
          <span aria-hidden="true" className="justify-self-end text-white/60">{open ? "−" : "+"}</span>
        </span>
      </button>
      {open && (
        <div id="recipe-import-content" className="border-t border-white/10 p-4">
          <p className="mb-3 text-xs text-white/65">
            Import CSV, BeerXML, or BeerJSON files up to 2 MB. CSV files must use Batchlogg&apos;s recipe export columns and can contain up to 25 recipes. Imported recipes remain private.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xml,.json,.beerjson,text/csv,application/json,application/xml,text/xml"
              aria-label="Choose a CSV, BeerXML, or BeerJSON file"
              className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"
              disabled={busy || disabled}
            />
            <button
              type="button"
              onClick={importFile}
              disabled={busy || disabled}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "Importing…" : "Import"}
            </button>
          </div>
          {error ? <p role="alert" className="mt-3 text-sm text-red-300">{error}</p> : null}
          {message ? <p role="status" className="mt-3 text-sm text-green-200">{message}</p> : null}
        </div>
      )}
    </section>
  );
}
