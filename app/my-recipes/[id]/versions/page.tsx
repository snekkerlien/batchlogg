"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PageHeading from "@/app/components/PageHeading";

type RecipeSnapshot = Record<string, unknown>;
type RecipeVersion = {
  id: string;
  version_number: number;
  recipe_snapshot: RecipeSnapshot;
  change_note: string | null;
  created_at: string;
};

export default function RecipeVersionsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [recipeName, setRecipeName] = useState("");
  const [currentRecipe, setCurrentRecipe] = useState<RecipeSnapshot | null>(null);
  const [versions, setVersions] = useState<RecipeVersion[]>([]);
  const [leftVersion, setLeftVersion] = useState("current");
  const [rightVersion, setRightVersion] = useState("current");
  const [loading, setLoading] = useState(true);
  const [premiumRequired, setPremiumRequired] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/recipes/${encodeURIComponent(params.id)}/versions`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const result: {
          recipe?: RecipeSnapshot;
          versions?: RecipeVersion[];
          error?: string;
        } = await response.json();
        if (response.status === 401) {
          router.replace("/auth/login");
          return;
        }
        if (response.status === 403) {
          if (active) setPremiumRequired(true);
          return;
        }
        if (!response.ok) throw new Error(result.error || "Could not load recipe versions");
        if (!active || !result.recipe) return;
        setCurrentRecipe(result.recipe);
        setRecipeName(String(result.recipe.name ?? "Recipe"));
        setVersions(result.versions ?? []);
      })
      .catch((loadError) => {
        console.error("Could not load recipe versions", loadError);
        if (active) setError("Recipe history could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.id, router]);

  const comparison = useMemo(() => {
    if (!currentRecipe) return [];
    const getSnapshot = (value: string) =>
      value === "current"
        ? currentRecipe
        : versions.find((version) => version.id === value)?.recipe_snapshot ?? {};
    const left = getSnapshot(leftVersion);
    const right = getSnapshot(rightVersion);
    return [...new Set([...Object.keys(left), ...Object.keys(right)])]
      .filter((key) => !["id", "user_id", "created_at", "updated_at"].includes(key))
      .filter((key) => JSON.stringify(left[key]) !== JSON.stringify(right[key]))
      .map((key) => ({
        key,
        before: left[key],
        after: right[key],
      }));
  }, [currentRecipe, leftVersion, rightVersion, versions]);

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="relative mx-auto max-w-4xl rounded-xl border border-white/10 bg-black/60 p-5 pt-16 backdrop-blur-md sm:p-8">
        <div className="absolute left-4 top-3"><BackButton /></div>
        <div className="absolute right-4 top-3"><MenuOverlay current="recipes" /></div>
        <PageHeading title="Recipe history" subtitle={recipeName || "Compare saved recipe versions."} />
        {loading ? (
          <p className="py-10 text-center text-white/60">Loading recipe history…</p>
        ) : premiumRequired ? (
          <div className="rounded-xl border border-green-400/20 bg-green-500/10 p-6 text-center">
            <p>Recipe version history and comparison are Premium features.</p>
            <Link href="/premium" className="mt-4 inline-block rounded-lg bg-green-700 px-5 py-3 font-semibold">Explore Premium</Link>
          </div>
        ) : error ? (
          <p role="alert" className="text-center text-red-300">{error}</p>
        ) : currentRecipe ? (
          <>
            <p className="mb-5 text-sm text-white/60">
              Previous snapshots are saved when you edit this recipe while Premium is active.
            </p>
            {versions.length === 0 ? (
              <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-center text-white/70">
                No saved versions yet. Edit this recipe to create the first snapshot.
              </p>
            ) : (
              <>
                <div className="mb-5 grid gap-3 sm:grid-cols-2">
                  {[leftVersion, rightVersion].map((value, index) => (
                    <label key={index} className="text-sm text-white/70">
                      {index === 0 ? "Compare" : "with"}
                      <select
                        value={value}
                        onChange={(event) =>
                          index === 0
                            ? setLeftVersion(event.target.value)
                            : setRightVersion(event.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3 text-white"
                      >
                        <option value="current">Current recipe</option>
                        {versions.map((version) => (
                          <option key={version.id} value={version.id}>
                            Version {version.version_number} · {new Date(version.created_at).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                {comparison.length === 0 ? (
                  <p className="text-center text-white/60">These versions have no field differences.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full min-w-[36rem] text-left text-sm">
                      <thead className="bg-white/5 text-white/60">
                        <tr><th className="p-3">Field</th><th className="p-3">First version</th><th className="p-3">Second version</th></tr>
                      </thead>
                      <tbody>
                        {comparison.map((change) => (
                          <tr key={change.key} className="border-t border-white/10">
                            <th className="p-3 align-top font-medium text-green-200">{change.key.replaceAll("_", " ")}</th>
                            <td className="max-w-sm whitespace-pre-wrap p-3 align-top">{JSON.stringify(change.before ?? "—", null, 2)}</td>
                            <td className="max-w-sm whitespace-pre-wrap p-3 align-top">{JSON.stringify(change.after ?? "—", null, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
