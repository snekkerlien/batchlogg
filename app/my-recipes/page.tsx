"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabaseBrowser } from "../../lib/supabase/supabaseBrowser";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";
import PageHeading from "@/app/components/PageHeading";
import { Qty, UnitAwareText, UnitInput, UnitSymbol, useUnits } from "@/app/components/Units";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VisibilitySwitch from "../components/VisibilitySwitch";
import RecipeFilters, { type RecipeSort } from "./RecipeFilters";
import RecipeImport from "./RecipeImport";
import RecipeAdditiveFields from "./new/RecipeAdditiveFields";
import RecipeSecondaryFields from "./new/RecipeSecondaryFields";
import RecipePresentation, { RecipeBadges } from "@/app/components/RecipePresentation";
import BeerColorGlass from "@/app/components/BeerColorGlass";
import BeerStyleSelect from "@/app/components/BeerStyleSelect";
import ExpandArrowButton from "@/app/components/ExpandArrowButton";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import {
  getOtherRecipeIngredients,
  getOtherRecipeStyle,
} from "@/lib/recipes/otherRecipe";
import {
  getSavedRecipeInventoryIssues,
  type InventoryItem,
} from "@/lib/inventory/recipeInventory";
import { FREE_RECIPE_LIMIT } from "@/lib/recipes/constants";



type Fruit = {
  name: string;
  amount: string;
  unit: string;
};

type Malt = {
  name: string;
  amount: string;
  unit: string;
  ebc: string;
};

type Hop = {
  name: string;
  alpha: string;
  year: string;
  amount: string;
  time: string;
  addition_type: "boil" | "whirlpool";
  temperature: string;
};

type DryHop = {
  name: string;
  amount: string;
  contact: string;
  alpha: string;
  year: string;
};

const batchFormRoutes: Record<string, string> = {
  beer: "beer",
  braggot: "braggot",
  cider: "cider",
  mead: "mead",
  other: "other",
  seltzer: "hard%20seltzer",
  "hard seltzer": "hard%20seltzer",
  wine: "wine",
};

export default function RecipesPage() {
  const router = useRouter();
  const { label } = useUnits();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [limitNotice, setLimitNotice] = useState(false);
  const [emptyVessels, setEmptyVessels] = useState<{ id: string; nummer: number }[]>([]);
  const [vesselsLoaded, setVesselsLoaded] = useState(false);
  const [startRecipeId, setStartRecipeId] = useState<string | null>(null);
  const [selectedVesselId, setSelectedVesselId] = useState("");
  const [startingRecipeId, setStartingRecipeId] = useState<string | null>(null);
  const [batchInventoryDialog, setBatchInventoryDialog] = useState<{
    recipe: Record<string, unknown>;
    vesselId: string;
    issues?: string[];
    error?: string;
  } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openStyleSelect, setOpenStyleSelect] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [savingCopyrightRecipeId, setSavingCopyrightRecipeId] = useState<
    string | null
  >(null);
  const [recipeActionErrors, setRecipeActionErrors] = useState<Record<string, string>>({});
  const [recipeStartErrors, setRecipeStartErrors] = useState<Record<string, string>>({});
  const [recipeManageOpen, setRecipeManageOpen] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("All");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeSort, setRecipeSort] = useState<RecipeSort>("newest");
  const [openEdit, setOpenEdit] = useState<string | null>(null);
  const [editRecipe, setEditRecipe] = useState<any>(null);
  const [editBeerSubtype, setEditBeerSubtype] = useState("all_grain");
  const [editBeerStyle, setEditBeerStyle] = useState("");
  const [editOtherStyle, setEditOtherStyle] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFruits, setEditFruits] = useState<Fruit[]>([]);
  const [editMalts, setEditMalts] = useState<Malt[]>([]);
  const [editHops, setEditHops] = useState<Hop[]>([]);
  const [editDryHops, setEditDryHops] = useState<DryHop[]>([]);
  const editDialogRef = useRef<HTMLDivElement>(null);





  useEffect(() => {
  setLoading(true);
  setLoadError("");
  setPlanLoaded(false);
  async function load() {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseBrowser.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      const profileResponse = await fetch("/api/profile", {
        cache: "no-store",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const profile = await profileResponse.json();
      if (!profileResponse.ok) {
        throw new Error(profile.error || "Could not load your account plan.");
      }
      setIsPremium(profile.account_tier === "premium");
      setPlanLoaded(true);
      setLimitNotice(new URLSearchParams(window.location.search).get("limit") === "reached");

      // ⭐ HENT BATCH NOTES
      const { data: notesRaw, error: notesError } = await supabaseBrowser
        .from("batch_notes")
        .select("batch_id")
        .eq("user_id", session.user.id);
      if (notesError) throw notesError;

      // ⭐ TYPE: Map batch_id → boolean
      const notesMap: Record<string, boolean> =
        notesRaw?.reduce((acc, n) => {
          acc[n.batch_id] = true;
          return acc;
        }, {} as Record<string, boolean>) || {};

      // ⭐ HENT RECIPES
      const { data: recipesRaw, error: recipesError } = await supabaseBrowser
        .from("recipes")
        .select(`
        id,
        user_id,
        batch_id,
        name,
        og,
        fg,
        abv,
        volume,
        notes,
        is_public,
        copyright_free,
        created_at,
        notes_log,
        had_secondary,
        secondary_additions,
        secondary_notes,
        type,
        honey_type,
        honey_amount,
        fruits,
        juice_type,
        sugar_amount,
        malts,
        hops,
        boil_time,
        steps,
        additives,
        full_process,
        yeast,
        ingredients,
        ibu,
        ebc,
        boil_volume,
        malt_warnings,
        dry_hops
      `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (recipesError) throw recipesError;

      let sourceRecipeIds = new Map<string, string>();
      const recipeIds = (recipesRaw ?? []).map((recipe) => recipe.id);
      if (recipeIds.length > 0) {
        const { data: sourceRows, error: sourceError } = await supabaseBrowser
          .from("recipes")
          .select("id, source_recipe_id")
          .in("id", recipeIds);
        if (sourceError && !["42703", "PGRST204"].includes(sourceError.code ?? "")) {
          throw sourceError;
        }
        if (sourceError) {
          console.warn("Recipe lineage is unavailable until the recipe source migration is applied.");
        } else {
          sourceRecipeIds = new Map(
            (sourceRows ?? [])
              .filter((recipe) => recipe.source_recipe_id)
              .map((recipe) => [recipe.id, recipe.source_recipe_id as string])
          );
        }
      }

      // ⭐ LEGG has_notes INN I RECIPES
      const recipesWithNotes = (recipesRaw ?? []).map((r) => ({
        ...r,
        source_recipe_id: sourceRecipeIds.get(r.id) ?? null,
        has_notes: notesMap[r.batch_id] || false,
      }));

      const { data: vessels, error: vesselsError } = await supabaseBrowser
        .from("kar")
        .select("id, nummer")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });
      if (vesselsError) throw vesselsError;

      const vesselIds = (vessels ?? []).map((vessel) => vessel.id);
      let occupiedVesselIds = new Set<string>();
      if (vesselIds.length > 0) {
        const { data: activeBatches, error: batchesError } = await supabaseBrowser
          .from("batches")
          .select("aktivt_kar")
          .in("aktivt_kar", vesselIds)
          .in("status", ["Aktiv", "Sekundær", "secondary", "Conditioning"]);
        if (batchesError) throw batchesError;
        occupiedVesselIds = new Set(
          (activeBatches ?? []).map((batch) => batch.aktivt_kar).filter(Boolean)
        );
      }

      const numberedVessels = (vessels ?? []).map((vessel, index) => ({
        ...vessel,
        nummer: index + 1,
      }));
      const availableVessels = numberedVessels.filter(
        (vessel) => !occupiedVesselIds.has(vessel.id)
      );
      setEmptyVessels(availableVessels);
      setVesselsLoaded(true);
      setRecipes(recipesWithNotes);
      const searchParams = new URLSearchParams(window.location.search);
      const requestedStartRecipe = searchParams.get("start");
      const requestedVesselId = searchParams.get("vessel");
      if (
        requestedVesselId &&
        availableVessels.some((vessel) => vessel.id === requestedVesselId)
      ) {
        setSelectedVesselId(requestedVesselId);
      }
      if (
        requestedStartRecipe &&
        recipesWithNotes.some((recipe) => String(recipe.id) === requestedStartRecipe)
      ) {
        setExpanded(requestedStartRecipe);
        setStartRecipeId(requestedStartRecipe);
      }
    } catch (error) {
      console.error("Could not load recipes", error);
      setLoadError("Your recipes could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  load();
}, [loadAttempt, router]);

  const recipeLimitReached =
    planLoaded && !isPremium && recipes.length >= FREE_RECIPE_LIMIT;

  useEffect(() => {
    if (openEdit) {
      const frame = window.requestAnimationFrame(() => {
        const dialog = editDialogRef.current;
        if (!dialog) return;

        const top = dialog.getBoundingClientRect().top + window.scrollY - 16;
        window.scrollTo({ top, behavior: "smooth" });
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [openEdit]);

  function openRecipeBatch(
    recipe: Record<string, unknown>,
    vesselId: string,
    skipInventory = false
  ) {
    const routeType = batchFormRoutes[String(recipe.type ?? "").toLowerCase()];
    if (!routeType) return;

    const searchParams = new URLSearchParams({
      recipe: String(recipe.id),
    });
    if (skipInventory) searchParams.set("skip_inventory", "true");
    router.push(
      `/kar/${vesselId}/new/${routeType}?${searchParams.toString()}`
    );
  }

  async function continueWithRecipe(recipe: Record<string, unknown>) {
    const vesselId = selectedVesselId;
    if (!vesselId || startingRecipeId) return;
    setStartingRecipeId(String(recipe.id));

    try {
      const {
        data: { user },
        error: userError,
      } = await supabaseBrowser.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Your session has expired. Sign in and try again.");

      const { data: profile, error: profileError } = await supabaseBrowser
        .from("profiles")
        .select("use_inventory_for_batches")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      if (profile?.use_inventory_for_batches !== true) {
        openRecipeBatch(recipe, vesselId);
        return;
      }

      const { data, error: inventoryError } = await supabaseBrowser
        .from("inventory_items")
        .select("id, name, amount, unit, minimum_amount, category, subcategory, alpha_acid, ebc, hop_year")
        .eq("user_id", user.id)
        .order("name");
      if (inventoryError) throw inventoryError;

      const items: InventoryItem[] = (data ?? [])
        .filter((item) => !/\bwater\b/i.test(item.name))
        .map((item) => ({
          ...item,
          amount: Number(item.amount),
          minimum_amount: Number(item.minimum_amount ?? 0),
        }));
      const issues = getSavedRecipeInventoryIssues(recipe, items, false, true);
      if (issues.length > 0) {
        setBatchInventoryDialog({ recipe, vesselId, issues });
        return;
      }

      openRecipeBatch(recipe, vesselId);
    } catch (error) {
      console.error("Could not check recipe ingredients against inventory", error);
      setRecipeStartErrors((previous) => ({
        ...previous,
        [String(recipe.id)]:
          "Inventory could not be checked. Please try again before starting this batch.",
      }));
    } finally {
      setStartingRecipeId(null);
    }
  }



  


  



  async function togglePublic(id: string, current: boolean) {
    setRecipeActionErrors((previous) => ({ ...previous, [id]: "" }));
    try {
      const response = await fetch(`/api/recipes/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_public: !current }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update recipe visibility.");

      setRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_public: !current } : r))
      );
    } catch (updateError) {
      console.error("Could not update recipe visibility", updateError);
      setRecipeActionErrors((previous) => ({
        ...previous,
        [id]:
          updateError instanceof Error
            ? updateError.message
            : "Could not update recipe visibility.",
      }));
    }
  }

  async function updateRecipeCopyright(id: string, copyrightFree: boolean) {
    if (savingCopyrightRecipeId) return;
    setSavingCopyrightRecipeId(id);
    setRecipeActionErrors((previous) => ({ ...previous, [id]: "" }));
    try {
      const response = await fetch(`/api/recipes/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ copyright_free: copyrightFree }),
      });
      const result: {
        error?: string;
        updated?: { copyright_free?: boolean };
      } = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error || "Could not update the recipe's copyright setting."
        );
      }
      setRecipes((previous) =>
        previous.map((recipe) =>
          recipe.id === id
            ? { ...recipe, copyright_free: result.updated?.copyright_free === true }
            : recipe
        )
      );
    } catch (updateError) {
      console.error("Could not update recipe copyright setting", updateError);
      setRecipeActionErrors((previous) => ({
        ...previous,
        [id]:
          updateError instanceof Error
            ? updateError.message
            : "Could not update the recipe's copyright setting.",
      }));
    } finally {
      setSavingCopyrightRecipeId(null);
    }
  }

  


  async function deleteRecipe(id: string) {
    setRecipeActionErrors((previous) => ({ ...previous, [id]: "" }));
    try {
      const response = await fetch("/api/recipes/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not delete this recipe.");
      }
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      setLimitNotice(false);
      return true;
    } catch (deleteError) {
      console.error("Could not delete recipe", deleteError);
      setExpanded(id);
      setRecipeActionErrors((previous) => ({
        ...previous,
        [id]:
          deleteError instanceof Error
            ? deleteError.message
            : "Could not delete this recipe.",
      }));
      return false;
    }
  }

  function openRecipeEditor(recipe: any) {
    setEditRecipe(recipe);
    setEditError(null);
    setEditBeerSubtype(
      recipe.type === "Beer"
        ? recipe.ingredients?.beer_subtype ?? "all_grain"
        : "all_grain"
    );
    setEditBeerStyle(
      recipe.type === "Beer" ? recipe.ingredients?.beer_style ?? "" : ""
    );
    setEditOtherStyle(recipe.type === "Other" ? getOtherRecipeStyle(recipe.ingredients) : "");
    setEditFruits(recipe.fruits || []);
    setOpenEdit(recipe.id);
    setEditMalts(
      (recipe.malts || []).map((malt: Partial<Malt>) => ({
        name: malt.name ?? "",
        amount: malt.amount ?? "",
        unit: malt.unit ?? "kg",
        ebc: malt.ebc == null ? "" : String(malt.ebc),
      }))
    );
    setEditHops(
      (recipe.hops || []).map((hop: Partial<Hop>) => ({
        name: hop.name ?? "",
        alpha: hop.alpha ?? "",
        year: hop.year ?? "",
        amount: hop.amount ?? "",
        time: hop.time ?? "",
        addition_type: hop.addition_type === "whirlpool" ? "whirlpool" : "boil",
        temperature: hop.temperature ?? "",
      }))
    );
    setEditDryHops(
      recipe.dry_hops?.length
        ? recipe.dry_hops.map((hop: Partial<DryHop>) => ({
            name: hop.name ?? "",
            amount: hop.amount ?? "",
            contact: hop.contact ?? "",
            alpha: hop.alpha == null ? "" : String(hop.alpha),
            year: hop.year == null ? "" : String(hop.year),
          }))
        : recipe.type === "Beer" &&
            (recipe.ingredients?.beer_subtype === "fresh_wort_kit" ||
              recipe.ingredients?.beer_subtype === "malt_extract_kit")
          ? (recipe.hops || []).map((hop: Hop) => ({
              name: hop.name,
              amount: hop.amount,
              contact: "",
              alpha: hop.alpha ?? "",
              year: hop.year ?? "",
            }))
          : []
    );
  }

  function toggle(id: string) {
    setExpanded(expanded === id ? null : id);
  }

  function addFruit() {
  setEditFruits([...editFruits, { name: "", amount: "", unit: "" }]);
}


function updateFruit(index: number, key: keyof Fruit, value: string) {
  const updated = [...editFruits];
  updated[index][key] = value;
  setEditFruits(updated);
}


function removeFruit(index: number) {
  const updated = [...editFruits];
  updated.splice(index, 1);
  setEditFruits(updated);
}

function addMalt() {
  setEditMalts([...editMalts, { name: "", amount: "", unit: "kg", ebc: "" }]);
}

function updateMalt(index: number, key: keyof Malt, value: string) {
  const updated = [...editMalts];
  updated[index][key] = value;
  setEditMalts(updated);
}

function removeMalt(index: number) {
  const updated = [...editMalts];
  updated.splice(index, 1);
  setEditMalts(updated);
}


function addHop() {
  setEditHops([
    ...editHops,
    {
      name: "",
      alpha: "",
      year: "",
      amount: "",
      time: "",
      addition_type: "boil",
      temperature: "",
    },
  ]);
}

function updateHop<K extends keyof Hop>(index: number, key: K, value: Hop[K]) {
  const updated = [...editHops];
  updated[index][key] = value;
  setEditHops(updated);
}

function removeHop(index: number) {
  const updated = [...editHops];
  updated.splice(index, 1);
  setEditHops(updated);
}


function addDryHop() {
  setEditDryHops([...editDryHops, { name: "", amount: "", contact: "", alpha: "", year: "" }]);
}

function updateDryHop(index: number, key: keyof DryHop, value: string) {
  const updated = [...editDryHops];
  updated[index][key] = value;
  setEditDryHops(updated);
}

function removeDryHop(index: number) {
  const updated = [...editDryHops];
  updated.splice(index, 1);
  setEditDryHops(updated);
}




  const filteredRecipes = recipes
    .filter((recipe) =>
      filterType === "All" ||
      recipe.type?.toLowerCase() === filterType.toLowerCase()
    )
    .filter((recipe) =>
      !recipeSearch.trim() ||
      String(recipe.name ?? "").toLowerCase().includes(recipeSearch.trim().toLowerCase())
    )
    .sort((a, b) => {
      if (recipeSort === "style") {
        const styleA =
          a.type === "Beer" && typeof a.ingredients?.beer_style === "string"
            ? a.ingredients.beer_style
            : "";
        const styleB =
          b.type === "Beer" && typeof b.ingredients?.beer_style === "string"
            ? b.ingredients.beer_style
            : "";
        return styleA.localeCompare(styleB, undefined, { sensitivity: "base" }) ||
          String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, {
            sensitivity: "base",
          });
      }
      if (recipeSort === "name") {
        return String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, {
          sensitivity: "base",
        });
      }
      const direction = recipeSort === "newest" ? -1 : 1;
      return direction * (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10">
          Loading recipes…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 py-6 text-white flex justify-center sm:px-6 sm:py-12">
      <div className="bg-black/60 backdrop-blur-md p-4 sm:p-8 rounded-xl w-full max-w-3xl border border-white/10 relative pt-16 sm:pt-16">

        {/* TOP BAR */}
        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay />
        </div>

        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <BackButton />
        </div>

        <PageHeading
          title="My recipes"
          subtitle="All your recipes in one place."
        />
        {(limitNotice || recipeLimitReached) && (
          <p role="status" className="mb-4 rounded-lg border border-amber-400/30 bg-amber-950/40 p-3 text-center text-sm text-amber-100">
            Free accounts can save up to {FREE_RECIPE_LIMIT} recipes. Delete a recipe or upgrade to Premium to save more.
            {" "}<Link href="/premium" className="font-semibold underline">View Premium</Link>
          </p>
        )}
        {planLoaded && !isPremium && (
          <p className="mb-4 text-center text-sm text-white/60">
            {recipes.length} of {FREE_RECIPE_LIMIT} free recipes used
          </p>
        )}
        {/* NEW RECIPE BUTTON */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setOpenStyleSelect(true)}
            disabled={recipeLimitReached}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            New recipe
          </button>
        </div>

        <RecipeImport
          disabled={recipeLimitReached}
          onImported={(importedRecipes) => {
            setRecipes((current) => [
              ...importedRecipes.map((recipe) => ({
                ...recipe,
                source_recipe_id: null,
                has_notes: false,
              })),
              ...current,
            ]);
          }}
        />

        {/* FILTER BAR */}
        <RecipeFilters
          type={filterType}
          onTypeChange={(nextType) => {
            setFilterType(nextType);
            if (nextType !== "Beer" && recipeSort === "style") {
              setRecipeSort("newest");
            }
          }}
          search={recipeSearch}
          onSearchChange={setRecipeSearch}
          sort={recipeSort}
          onSortChange={setRecipeSort}
        />

        {/* RECIPE LIST */}
        <div className={openEdit ? "hidden" : "space-y-4"}>
          {loadError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-950/40 p-5 text-center text-red-200"
            >
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                className="mt-3 rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20"
              >
                Try again
              </button>
            </div>
          ) : filteredRecipes.length > 0 ? (
            filteredRecipes.map((r) => {
              const og = r.og ? Number(r.og).toFixed(3) : "—";
              const fg = r.fg ? Number(r.fg).toFixed(3) : "—";
              const abv = r.abv ? Number(r.abv).toFixed(1) : "—";
              const ibu = r.ibu ? Number(r.ibu).toFixed(0) : "—";
              const ebc = Number(r.ebc);
              const volume = r.volume ?? "—";
              const recipeCategory =
                r.type === "Beer" && typeof r.ingredients?.beer_style === "string" &&
                r.ingredients.beer_style.trim()
                  ? `Beer - ${r.ingredients.beer_style.trim()}`
                  : r.type === "Other" && getOtherRecipeStyle(r.ingredients)
                    ? getOtherRecipeStyle(r.ingredients)
                    : r.type;

              return (
                              <div
                key={r.id}
                className="bg-white/10 border border-white/20 rounded-xl p-4 sm:p-6"
              >



{/* HEADER */}
<div
  className="flex w-full items-start justify-between gap-3 sm:items-center"
>
  {/* Tittel */}
  <div
    className={`min-w-0 flex-1 text-left ${expanded === r.id ? "flex flex-wrap items-center gap-2" : ""}`}
  >
    <Link
      href={`/my-recipes/${encodeURIComponent(r.id)}`}
      className="flex items-center gap-3 text-lg font-bold leading-tight text-green-300 hover:text-green-200 sm:text-xl"
    >
      {r.name ? r.name.charAt(0).toUpperCase() + r.name.slice(1) : "Unnamed recipe"}
    </Link>
    {expanded === r.id ? (
      <RecipeBadges recipe={r} />
    ) : (
      <p className="mt-1 text-sm text-white/60">{recipeCategory}</p>
    )}
  </div>

<div className="flex shrink-0 items-center justify-end sm:mt-[6px]">
  <ExpandArrowButton
    expanded={expanded === r.id}
    label={r.name || "recipe"}
    controls={`recipe-details-${r.id}`}
    onClick={() => toggle(r.id)}
  />
</div>

</div>
                  {/* Stats line */}
{expanded !== r.id && (
<div
  aria-label={`${r.name} recipe summary`}
  className="mt-3 grid grid-cols-3 gap-x-2 gap-y-1.5 text-sm sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1"
>
  <span className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap rounded-md border border-white/10 bg-black/20 px-2 py-1 sm:gap-1.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
    <strong className="text-[10px] text-white/55 sm:text-sm sm:text-white">OG:</strong>
    <span className="text-xs sm:text-sm">{og}</span>
  </span>
  <span className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap rounded-md border border-white/10 bg-black/20 px-2 py-1 sm:gap-1.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
    <strong className="text-[10px] text-white/55 sm:text-sm sm:text-white">FG:</strong>
    <span className="text-xs sm:text-sm">{fg}</span>
  </span>
  <span className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap rounded-md border border-white/10 bg-black/20 px-2 py-1 sm:gap-1.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
    <strong className="text-[10px] text-white/55 sm:text-sm sm:text-white">ABV:</strong>
    <span className="text-xs sm:text-sm">{abv}%</span>
  </span>
  {(r.type === "Beer" || r.type === "Braggot") && (
    <>
      <span className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap rounded-md border border-white/10 bg-black/20 px-2 py-1 sm:gap-1.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <strong className="text-[10px] text-white/55 sm:text-sm sm:text-white">IBU:</strong>
        <span className="text-xs sm:text-sm">{ibu}</span>
      </span>
      <span className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap rounded-md border border-white/10 bg-black/20 px-2 py-1 sm:gap-1.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <strong className="text-[10px] text-white/55 sm:text-sm sm:text-white">EBC:</strong>
        <span className="inline-flex items-center gap-0.5 text-xs sm:gap-1 sm:text-sm">
          {Number.isFinite(ebc) ? ebc.toFixed(0) : "—"}
          {Number.isFinite(ebc) && <BeerColorGlass ebc={ebc} compact />}
        </span>
      </span>

    </>
  )}
</div>
)}

<div className="mt-3 flex flex-wrap gap-2">
  <Link
    href={`/my-recipes/${encodeURIComponent(r.id)}`}
    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
  >
    View recipe
  </Link>
  <button
    type="button"
    onClick={() => {
      setExpanded(r.id);
      setStartRecipeId(r.id);
      setSelectedVesselId("");
      setRecipeStartErrors((previous) => ({ ...previous, [r.id]: "" }));
    }}
    className="rounded-lg border border-green-500 bg-green-700 px-3 py-2 text-sm font-semibold hover:bg-green-600"
  >
    Start a batch
  </button>
</div>

                  {/* SLIDER CONTENT */}
                  <div
                    id={`recipe-details-${r.id}`}
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    expanded === r.id ? "max-h-[6000px] mt-2" : "max-h-0"
                    }`}
                  >
                    <div className="space-y-3 opacity-90">
                      {r.source_recipe_id && (
                        <p className="text-sm text-white/65">
                          This is your version of a shared community recipe.
                        </p>
                      )}
                      <RecipePresentation
                        recipe={r}
                        compact
                        showBadges={false}
                        beforeMetrics={
                          <div className="mb-3 w-full rounded-lg border border-white/10 bg-black/20">
                            <button
                              type="button"
                              aria-expanded={recipeManageOpen === r.id}
                              aria-controls={`recipe-manage-${r.id}`}
                              onClick={() =>
                                setRecipeManageOpen((current) =>
                                  current === r.id ? null : r.id
                                )
                              }
                              className="w-full cursor-pointer px-4 py-3 text-left text-sm font-semibold text-white/75 hover:text-white"
                            >
                              Manage recipe
                              <span aria-hidden="true" className="float-right text-white/60">
                                {recipeManageOpen === r.id ? "−" : "+"}
                              </span>
                            </button>
                            {recipeManageOpen === r.id && (
                              <div
                                id={`recipe-manage-${r.id}`}
                                className="border-t border-white/10 p-4"
                              >
                                {recipeActionErrors[r.id] && (
                                  <p
                                    role="alert"
                                    className="mb-3 rounded-lg border border-red-400/40 bg-red-950/50 p-3 text-sm text-red-200"
                                  >
                                    {recipeActionErrors[r.id]}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-3">
                                  <VisibilitySwitch
                                    checked={r.is_public}
                                    onChange={() => togglePublic(r.id, r.is_public)}
                                    publicText="Public"
                                    privateText="Private"
                                    ariaLabel={`Recipe ${r.name} visibility`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => openRecipeEditor(r)}
                                    className="rounded-lg border border-green-500 bg-green-700 px-4 py-2 text-sm font-semibold hover:bg-green-600"
                                  >
                                    Edit recipe
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(r.id)}
                                    className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
                                  >
                                    Delete recipe
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        }
                      />
                      <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-sm text-white/70">
                          Copyright belongs to you as the recipe uploader by
                          default.
                        </p>
                        <label className="mt-3 flex items-start gap-3 text-sm">
                          <input
                            type="checkbox"
                            checked={r.copyright_free === true}
                            disabled={savingCopyrightRecipeId !== null}
                            onChange={(event) =>
                              void updateRecipeCopyright(
                                r.id,
                                event.target.checked
                              )
                            }
                            className="mt-1"
                          />
                          <span>
                            Mark this recipe as copyright-free
                            <span className="mt-1 block text-xs text-white/55">
                              Leave unchecked to keep it marked as copyrighted
                              by you.
                            </span>
                          </span>
                        </label>
                        {savingCopyrightRecipeId === r.id && (
                          <p role="status" className="mt-2 text-xs text-white/55">
                            Saving copyright setting…
                          </p>
                        )}
                      </section>
                      {r.notes_log?.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                          <h3 className="mb-3 text-lg font-semibold text-green-300">Recipe note log</h3>
                          <ul className="space-y-2">
                            {r.notes_log.map((note: any, index: number) => (
                              <li key={note.id ?? index} className="whitespace-pre-line text-sm text-white/80">
                                <UnitAwareText text={note.note} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    <div
                      className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {startRecipeId === r.id ? (
                        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
                          <select
                            aria-label={`Select an empty vessel for ${r.name}`}
                            value={selectedVesselId}
                            onChange={(e) => setSelectedVesselId(e.target.value)}
                            className="flex-1 p-3 rounded bg-black/40 border border-white/20"
                          >
                            <option value="">
                              {vesselsLoaded
                                ? emptyVessels.length
                                  ? "Select an empty vessel"
                                  : "No empty vessels available"
                                : "Loading vessels…"}
                            </option>
                            {emptyVessels.map((vessel) => (
                              <option key={vessel.id} value={vessel.id}>
                                Vessel {vessel.nummer}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={
                              !selectedVesselId ||
                              !vesselsLoaded ||
                              startingRecipeId !== null ||
                              !batchFormRoutes[r.type?.toLowerCase()]
                            }
                            onClick={() => void continueWithRecipe(r)}
                            className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold disabled:opacity-50"
                          >
                            {startingRecipeId === r.id ? "Checking inventory..." : "Continue with recipe"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStartRecipeId(null);
                              setSelectedVesselId("");
                            }}
                            className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : null}
                      {recipeStartErrors[r.id] && (
                        <p
                          role="alert"
                          className="w-full rounded-lg border border-red-400/40 bg-red-950/50 p-3 text-sm text-red-200"
                        >
                          {recipeStartErrors[r.id]}
                        </p>
                      )}
                    </div>
                    </div>
                    <p className="mt-4 border-t border-white/10 pt-3 text-center text-xs text-white/55">
                      Created{" "}
                      {r.created_at
                        ? new Date(r.created_at).toLocaleDateString("en-GB")
                        : "date unavailable"}
                      {" · "}
                      {r.copyright_free === true
                        ? "Marked copyright-free by you"
                        : `Copyright © ${r.created_at ? new Date(r.created_at).getFullYear() : new Date().getFullYear()} you. All rights reserved.`}
                    </p>
                  </div>
                </div>
              );
            })
          ) : recipes.length === 0 ? (
            <div role="status" className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-white/75">You haven’t saved any recipes yet.</p>
              <button
                type="button"
                onClick={() => setOpenStyleSelect(true)}
                className="mt-4 rounded-lg border border-green-500/40 bg-green-800/60 px-4 py-2 font-semibold hover:bg-green-700"
              >
                Create your first recipe
              </button>
            </div>
          ) : (
            <div role="status" className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
              <p className="text-white/75">No recipes match your search or filters.</p>
              <button
                type="button"
                onClick={() => {
                  setFilterType("All");
                  setRecipeSearch("");
                }}
                className="mt-3 rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

          {openEdit && editRecipe && (
  <>
    <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
    <div
      ref={editDialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-recipe-title"
      className="relative z-50 mx-auto mt-0 mb-8 w-full max-w-2xl rounded-xl border border-white/20 bg-zinc-900 p-6 text-white"
    >

      <h2 id="edit-recipe-title" className="text-2xl font-bold mb-4">Edit recipe</h2>

      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setEditError(null);
          setSavingEdit(true);

          const formData = new FormData(e.currentTarget);
          const payload = Object.fromEntries(formData.entries());

          try {
            const response = await fetch("/api/recipes/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ id: openEdit, ...payload }),
            });
            const result: { error?: string; details?: string } = await response.json();
            if (!response.ok) {
              setEditError(
                result.details
                  ? `${result.error || "Could not save the recipe."}: ${result.details}`
                  : result.error || "Could not save the recipe."
              );
              return;
            }
            setOpenEdit(null);
            window.location.reload();
          } catch (error) {
            setEditError(
              error instanceof Error ? error.message : "Could not save the recipe."
            );
          } finally {
            setSavingEdit(false);
          }
        }}
      >

        {editError && (
          <p role="alert" className="rounded border border-red-400/40 bg-red-950/50 p-3 text-red-200">
            {editError}
          </p>
        )}

        <input type="hidden" name="type" value={editRecipe.type} />


        {/* COMMON FIELDS */}
        <label className="font-semibold">
          {editRecipe.type === "Beer" && editBeerSubtype !== "all_grain" ? "Kit name" : "Name"}
        </label>
        <input
          name="name"
          defaultValue={editRecipe.name}
          required={editRecipe.type === "Beer" && editBeerSubtype !== "all_grain"}
          className="p-3 rounded bg-black/40 border border-white/20"
        />

        {editRecipe.type === "Beer" && editBeerSubtype !== "all_grain" && (
          <label className="block">
            <span className="font-semibold">Kit link (optional)</span>
            <input
              name="kit_url"
              type="url"
              defaultValue={editRecipe.ingredients?.kit_url ?? ""}
              placeholder="https://example.com/kit"
              className="mt-1 w-full rounded border border-white/20 bg-black/40 p-3"
            />
          </label>
        )}

        <label className="font-semibold">
          Volume (<UnitSymbol kind="volume" />)
        </label>
        <UnitInput
          kind="volume"
          name="volume"
          defaultValue={String(editRecipe.volume ?? "")}
          required={editRecipe.type === "Beer" && editBeerSubtype !== "all_grain"}
          className="p-3 rounded bg-black/40 border border-white/20"
        />

        <label className="font-semibold">OG</label>
        <input
          name="og"
          type="text"
          defaultValue={editRecipe.og}
          required={editRecipe.type === "Beer" && editBeerSubtype !== "all_grain"}
          className="p-3 rounded bg-black/40 border border-white/20"
        />

        {editRecipe.type === "Beer" && editBeerSubtype === "fresh_wort_kit" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block font-semibold">
              IBU (from kit)
              <input
                name="ibu"
                type="number"
                min="0"
                step="any"
                defaultValue={
                  editRecipe.ingredients?.beer_subtype === "fresh_wort_kit"
                    ? String(editRecipe.ibu ?? "")
                    : ""
                }
                required
                className="mt-1 w-full rounded border border-white/20 bg-black/40 p-3 font-normal"
              />
            </label>
            <label className="block font-semibold">
              EBC (from kit)
              <input
                name="ebc"
                type="number"
                min="0"
                step="any"
                defaultValue={
                  editRecipe.ingredients?.beer_subtype === "fresh_wort_kit"
                    ? String(editRecipe.ebc ?? "")
                    : ""
                }
                required
                className="mt-1 w-full rounded border border-white/20 bg-black/40 p-3 font-normal"
              />
            </label>
          </div>
        )}
        {!(editRecipe.type === "Beer" && editBeerSubtype !== "all_grain") && (
          <>
            <label className="font-semibold">FG</label>
            <input
              name="fg"
              type="text"
              defaultValue={editRecipe.fg}
              className="p-3 rounded bg-black/40 border border-white/20"
            />
          </>
        )}

        <label className="font-semibold">Yeast</label>
        <input
          name="yeast"
          defaultValue={editRecipe.yeast}
          required={editRecipe.type === "Beer" && editBeerSubtype !== "all_grain"}
          className="p-3 rounded bg-black/40 border border-white/20"
        />

        {/* TYPE SPECIFIC */}
        {editRecipe.type === "Mead" && (
  <>
    <label className="block mb-2 font-semibold">Honey type</label>
    <input
      name="honey_type"
      defaultValue={editRecipe.honey_type}
      className="p-3 rounded bg-black/40 border border-white/20"
    />

    <label className="block mb-2 font-semibold">
      Honey amount (<UnitSymbol kind="kg" />)
    </label>
    <UnitInput
      kind="kg"
      name="honey_amount"
      defaultValue={String(editRecipe.honey_amount ?? "")}
      className="p-3 rounded bg-black/40 border border-white/20"
    />
    <label className="font-semibold">Base liquid</label>
    <input
      name="base_liquid"
      defaultValue={editRecipe.base_liquid ?? ""}
      className="p-3 rounded bg-black/40 border border-white/20"
    />
    <label className="font-semibold">
      Base liquid amount (<UnitSymbol kind="volume" />)
    </label>
    <UnitInput
      kind="volume"
      name="base_liquid_amount"
      defaultValue={String(editRecipe.base_liquid_amount ?? "")}
      className="p-3 rounded bg-black/40 border border-white/20"
    />

    {/* ⭐ Fruits — identisk med batch creation */}
    <div className="space-y-2">
      <label className="block font-semibold">Fruit additions</label>

      {editFruits.map((f, i) => (
        <div
          key={i}
          className="flex w-full flex-col gap-2 md:flex-row md:items-center"
        >
          <input
            placeholder="Fruit (e.g. Mango, Raspberry)"
            className="p-3 rounded bg-black/40 border border-white/20 w-full md:flex-1"
            value={f.name}
            onChange={(e) => updateFruit(i, "name", e.target.value)}
          />

          <input
            placeholder="Amount"
            className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-24"
            value={f.amount}
            onChange={(e) => updateFruit(i, "amount", e.target.value)}
          />

          <input
            placeholder="Unit"
            className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-20"
            value={f.unit}
            onChange={(e) => updateFruit(i, "unit", e.target.value)}
          />

          <button
            type="button"
            onClick={() => removeFruit(i)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm self-start md:self-auto"
          >
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addFruit}
        className="inline-flex w-32 self-start items-center justify-center whitespace-nowrap rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
      >
        + Add fruit
      </button>
    </div>
    <input type="hidden" name="fruits" value={JSON.stringify(editFruits)} />
  </>
)}



        {(editRecipe.type === "Wine" || editRecipe.type === "Cider") && (
          <>
            <label className="font-semibold">Juice / Must</label>
            <input
              name="juice_type"
              defaultValue={editRecipe.juice_type}
              className="p-3 rounded bg-black/40 border border-white/20"
            />

            <label className="font-semibold">
              Sugar added (<UnitSymbol kind="kg" />)
            </label>
            <UnitInput
              kind="kg"
              name="sugar_amount"
              defaultValue={String(editRecipe.sugar_amount ?? "")}
              className="p-3 rounded bg-black/40 border border-white/20"
            />
          </>
        )}

        {editRecipe.type === "Seltzer" && (
  <>
    <label className="font-semibold">
      Sugar added (<UnitSymbol kind="kg" />)
    </label>
    <UnitInput
      kind="kg"
      name="sugar_amount"
      defaultValue={String(editRecipe.sugar_amount ?? "")}
      className="p-3 rounded bg-black/40 border border-white/20"
    />
  </>
)}


        {(editRecipe.type === "Beer" || editRecipe.type === "Braggot") && (
  <>
    {editRecipe.type === "Beer" && (
      <label className="block">
        <span className="font-semibold">Brewing method</span>
        <select
          name="beer_subtype"
          value={editBeerSubtype}
          onChange={(event) => setEditBeerSubtype(event.target.value)}
          className="mt-1 w-full rounded border border-white/20 bg-zinc-900 p-3"
        >
          <option value="all_grain">All-grain</option>
          <option value="fresh_wort_kit">Fresh wort kit</option>
          <option value="malt_extract_kit">Malt extract kit</option>
        </select>
      </label>
    )}
    {editRecipe.type === "Beer" && (
      <BeerStyleSelect
        id="edit-beer-style"
        value={editBeerStyle}
        onChange={setEditBeerStyle}
      />
    )}

    {/* Boil Volume */}
    {(editRecipe.type === "Braggot" || editBeerSubtype === "all_grain") && (
    <>
          <div>
            <label className="block mb-1 font-semibold">
              Boil Volume (<UnitSymbol kind="volume" />)
            </label>
            <UnitInput
              kind="volume"
              name="boil_volume"
              defaultValue={String(editRecipe.boil_volume ?? "")}
              placeholder="Total wort volume before the boil"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>
    </>
    )}
    
    {/* MALTS */}
    {(editRecipe.type === "Braggot" || editBeerSubtype === "all_grain") && (
    <>
    <div>
      <label className="block mb-2 font-semibold">Malt additions</label>

      {editMalts.map((m, i) => (
        <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 mb-2 w-full">
          <input
            placeholder="Malt type"
            className="p-3 rounded bg-black/40 border border-white/20 w-full md:flex-1"
            value={m.name}
            onChange={(e) => updateMalt(i, "name", e.target.value)}
          />

          <input
            type="number"
            min="0"
            step="any"
            placeholder="EBC"
            aria-label={`Malt ${i + 1} EBC`}
            className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-24"
            value={m.ebc}
            onChange={(e) => updateMalt(i, "ebc", e.target.value)}
          />

          <UnitInput
            kind="kg"
            placeholder={`Amount (${label("kg")})`}
            className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-32"
            value={m.amount}
            onValueChange={(value) => updateMalt(i, "amount", value)}
          />

          <button
            type="button"
            onClick={() => removeMalt(i)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
          >
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addMalt}
        className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
      >
        + Add malt
      </button>
    </div>

    <input type="hidden" name="malts" value={JSON.stringify(editMalts)} />
    </>
    )}

    {/* HOPS */}
    {(editRecipe.type === "Braggot" || editBeerSubtype === "all_grain") && (
    <>
    <div>
      <label className="block mb-2 font-semibold">Hop additions</label>

      {editHops.map((h, i) => (
        <div key={i} className="mb-4 w-full space-y-2">

          <input
            placeholder="Hop type"
            className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
            value={h.name}
            onChange={(e) => updateHop(i, "name", e.target.value)}
          />

          <select
            aria-label={`Hop addition ${i + 1} type`}
            value={h.addition_type}
            onChange={(e) =>
              updateHop(i, "addition_type", e.target.value as "boil" | "whirlpool")
            }
            className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
          >
            <option value="boil">Boil addition</option>
            <option value="whirlpool">Whirlpool / hop stand</option>
          </select>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(6.5rem,0.8fr)_minmax(5rem,0.6fr)_minmax(7rem,1fr)_minmax(9rem,1.4fr)_auto]">
          <input
            placeholder="Alpha (%)"
            className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
            value={h.alpha}
            onChange={(e) => updateHop(i, "alpha", e.target.value)}
          />

          <input
            placeholder="Year"
            className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
            value={h.year}
            onChange={(e) => updateHop(i, "year", e.target.value)}
          />

          <UnitInput
            kind="g"
            placeholder={`Amount (${label("g")})`}
            className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
            value={h.amount}
            onValueChange={(value) => updateHop(i, "amount", value)}
          />

          <input
            aria-label={`Hop addition ${i + 1} time in minutes`}
            placeholder={
              h.addition_type === "whirlpool"
                ? "Stand time (min)"
                : "Boil time (min)"
            }
            type="number"
            min="0"
            step="any"
            required={Boolean(h.name.trim() || h.amount.trim() || h.alpha.trim())}
            className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
            value={h.time}
            onChange={(e) => updateHop(i, "time", e.target.value)}
          />

          {h.addition_type === "whirlpool" && (
            <input
              aria-label={`Hop addition ${i + 1} whirlpool temperature in Celsius`}
              placeholder="Temperature (°C)"
              type="number"
              min="0"
              max="100"
              step="any"
              required={Boolean(h.name.trim() || h.amount.trim() || h.alpha.trim())}
              className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
              value={h.temperature}
              onChange={(e) => updateHop(i, "temperature", e.target.value)}
            />
          )}

          <button
            type="button"
            onClick={() => removeHop(i)}
            className="col-span-2 justify-self-end rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm hover:bg-white/20 sm:col-span-1 sm:justify-self-auto"
          >
            Remove
          </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addHop}
        className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
      >
        + Add hop
      </button>
    </div>

    <input type="hidden" name="hops" value={JSON.stringify(editHops)} />
    </>
    )}

    {/* DRY HOPS */}
    {(editRecipe.type === "Braggot" || editRecipe.type === "Beer") && (
    <>
    <div>
      <label className="mb-2 block font-semibold">
        Dry hop additions
      </label>

      {editDryHops.map((h, i) => (
        <div key={i} className="mb-4 w-full space-y-2">

          <input
            placeholder="Hop type"
            className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
            value={h.name}
            onChange={(e) => updateDryHop(i, "name", e.target.value)}
          />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(6rem,0.8fr)_minmax(5rem,0.6fr)_minmax(7rem,1fr)_minmax(9rem,1.4fr)_auto]">
          <input
            type="number"
            min="0"
            max="100"
            step="any"
            placeholder="Alpha (%)"
            aria-label={`Dry hop ${i + 1} alpha acid percentage`}
            className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
            value={h.alpha}
            onChange={(e) => updateDryHop(i, "alpha", e.target.value)}
          />

          <input
            type="number"
            min="1900"
            step="1"
            placeholder="Year"
            aria-label={`Dry hop ${i + 1} crop year`}
            className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
            value={h.year}
            onChange={(e) => updateDryHop(i, "year", e.target.value)}
          />

          <UnitInput
            kind="g"
            placeholder={`Amount (${label("g")})`}
            className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
            value={h.amount}
            onValueChange={(value) => updateDryHop(i, "amount", value)}
          />

          <input
            placeholder="Contact time (days)"
            className="w-full min-w-0 rounded-lg border border-white/20 bg-black/40 p-3"
            value={h.contact}
            onChange={(e) => updateDryHop(i, "contact", e.target.value)}
          />

          <button
            type="button"
            onClick={() => removeDryHop(i)}
            className="col-span-2 justify-self-end rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm hover:bg-white/20 sm:col-span-1 sm:justify-self-auto"
          >
            Remove
          </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addDryHop}
        className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm"
      >
        + Add dry hop
      </button>

      

      
    </div>

    <input type="hidden" name="dry_hops" value={JSON.stringify(editDryHops)} />
    </>
    )}


    {/* Boil time */}
    {(editRecipe.type === "Braggot" || editBeerSubtype === "all_grain") && (
    <>
          <div>
            <label className="block mb-1 font-semibold">Total boil time (minutes)</label>
            <input
              name="boil_time"
              type="text"
              defaultValue={editRecipe.boil_time}
              placeholder="Length of the boil"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>
    </>
    )}

  </>
)}


        {editRecipe.type === "Other" && (
          <>
            <label className="font-semibold">
              Style or type (optional)
              <input
                name="other_style"
                value={editOtherStyle}
                maxLength={80}
                onChange={(event) => setEditOtherStyle(event.target.value)}
                placeholder="Example: Kombucha"
                className="mt-2 w-full rounded border border-white/20 bg-black/40 p-3"
              />
            </label>
            <label className="font-semibold">
              Ingredients (JSON)
              <textarea
                name="ingredients"
                defaultValue={
                  JSON.stringify(getOtherRecipeIngredients(editRecipe.ingredients), null, 2)
                }
                rows={5}
                className="mt-2 w-full rounded border border-white/20 bg-black/40 p-3 font-mono text-sm"
              />
            </label>
            <label className="font-semibold">
              Steps (JSON)
              <textarea
                name="steps"
                defaultValue={
                  typeof editRecipe.steps === "string"
                    ? editRecipe.steps
                    : JSON.stringify(editRecipe.steps ?? [], null, 2)
                }
                rows={5}
                className="mt-2 w-full rounded border border-white/20 bg-black/40 p-3 font-mono text-sm"
              />
            </label>
          </>
        )}

        {/* Shared fields */}
        <div>
          <label className="mb-2 block font-semibold">Additives</label>
          <RecipeAdditiveFields
            defaultValue={String(editRecipe.additives ?? "")}
          />
        </div>

        <label className="font-semibold">Full process</label>
        <textarea
          name="full_process"
          defaultValue={editRecipe.full_process}
          className="p-3 rounded bg-black/40 border border-white/20"
        />

        <label className="font-semibold">Notes</label>
        <textarea
          name="notes"
          defaultValue={editRecipe.notes}
          className="p-3 rounded bg-black/40 border border-white/20"
        />

        <RecipeSecondaryFields
          key={editRecipe.id}
          defaultValue={editRecipe.secondary_additions}
          defaultNotes={editRecipe.secondary_notes}
          defaultEnabled={
            editRecipe.had_secondary === true ||
            Boolean(editRecipe.secondary_additions || editRecipe.secondary_notes)
          }
        />


        <button
          disabled={savingEdit}
          className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold disabled:opacity-50"
        >
          {savingEdit ? "Saving..." : "Save changes"}
        </button>
      </form>

      <button
        onClick={() => setOpenEdit(null)}
        className="mt-4 w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 border border-zinc-500 rounded-lg font-semibold"
      >
        Cancel
      </button>
    </div>
  </>
)}

{batchInventoryDialog && typeof document !== "undefined" && createPortal(
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
    <section
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="batch-inventory-dialog-title"
      className="w-full max-w-lg rounded-xl border border-amber-400/30 bg-zinc-900 p-6 text-white shadow-2xl"
    >
      <h2 id="batch-inventory-dialog-title" className="mb-3 text-xl font-bold">
        {batchInventoryDialog.error
          ? "Could not check inventory"
          : "Not enough inventory for this recipe"}
      </h2>
      {batchInventoryDialog.error ? (
        <p role="alert" className="mb-6 text-sm text-amber-200">
          {batchInventoryDialog.error}
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-zinc-300">
            The new batch has not been opened. Add or match these ingredients before
            continuing:
          </p>
          <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-amber-200">
            {batchInventoryDialog.issues?.map((issue, index) => (
              <li key={`${index}:${issue}`}>{issue}</li>
            ))}
          </ul>
          <p className="mb-6 text-sm text-zinc-300">
            You can temporarily continue without using inventory for this batch. Your
            inventory and inventory setting will not be changed.
          </p>
        </>
      )}
      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setBatchInventoryDialog(null)}
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
        >
          {batchInventoryDialog.error ? "Close" : "Review recipe"}
        </button>
        {!batchInventoryDialog.error && (
          <button
            type="button"
            onClick={() => {
              openRecipeBatch(
                batchInventoryDialog.recipe,
                batchInventoryDialog.vesselId,
                true
              );
              setBatchInventoryDialog(null);
            }}
            className="rounded-lg border border-amber-400/40 bg-amber-700/80 px-4 py-2 font-semibold hover:bg-amber-700"
          >
            Continue without inventory
          </button>
        )}
      </div>
    </section>
  </div>,
  document.body
)}

<ConfirmDialog
  open={confirmDeleteId !== null}
  title="Delete recipe?"
  message={
    confirmDeleteId && recipeActionErrors[confirmDeleteId]
      ? `Could not delete this recipe: ${recipeActionErrors[confirmDeleteId]}`
      : "Are you sure you want to delete this recipe? This action cannot be undone."
  }
  confirmLabel="Delete"
  onConfirm={async () => {
    if (!confirmDeleteId) return false;
    await deleteRecipe(confirmDeleteId);
    return true;
  }}
  onCancel={() => setConfirmDeleteId(null)}
/>

        {/* STYLE SELECT MODAL */}
        {openStyleSelect && typeof document !== "undefined" && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm sm:items-center"
            onClick={() => setOpenStyleSelect(false)}
          >
            <div
              className="max-h-[calc(100dvh-4rem)] w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-black/60 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-center mb-6">Choose recipe type</h2>

              <div className="flex flex-col gap-4">
                {["Mead", "Beer", "Cider", "Wine", "Seltzer", "Braggot", "Other"].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      router.push(`/my-recipes/new/${type.toLowerCase()}`);
                    }}
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
                  >
                    {type}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setOpenStyleSelect(false)}
                className="mt-8 w-full px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>,
          document.body
        )}

      </div>
    </main>
  );
}
