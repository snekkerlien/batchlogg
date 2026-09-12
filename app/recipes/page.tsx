"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../lib/supabase/supabaseBrowser";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";
import Link from "next/link";

function ebcToHex(ebc: number | string) {
  const value = Number(ebc);

  if (isNaN(value) || value <= 0) return "#f3f3f3"; // pale fallback

  const srm = value / 1.97;

  const r = Math.round(255 * Math.pow(0.975, srm));
  const g = Math.round(245 * Math.pow(0.88, srm));
  const b = Math.round(220 * Math.pow(0.7, srm));

  const clamp = (v: number) => Math.max(0, Math.min(255, v));

  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}



type Fruit = {
  name: string;
  amount: string;
  unit: string;
};

type Malt = {
  name: string;
  amount: string;
};

type Hop = {
  name: string;
  alpha: string;
  year: string;
  amount: string;
  time: string;
};

type DryHop = {
  name: string;
  amount: string;
  contact: string;
};


export default function RecipesPage() {
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openStyleSelect, setOpenStyleSelect] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("All");
  const [openEdit, setOpenEdit] = useState<string | null>(null);
  const [editRecipe, setEditRecipe] = useState<any>(null);
  const [editFruits, setEditFruits] = useState<Fruit[]>([]);
  const [hadSecondary, setHadSecondary] = useState(false);
  const [secondaryAdditions, setSecondaryAdditions] = useState("");
  const [secondaryNotes, setSecondaryNotes] = useState("");
  const [editMalts, setEditMalts] = useState<Malt[]>([]);
  const [editHops, setEditHops] = useState<Hop[]>([]);
  const [editDryHops, setEditDryHops] = useState<DryHop[]>([]);





  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!session) {
        window.location.href = "/auth/login";
        return;
      }

      const { data: recipesRaw } = await supabaseBrowser
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

      setRecipes(recipesRaw ?? []);
      setLoading(false);
    }

    load();
  }, []);

  async function togglePublic(id: string, current: boolean) {
    await supabaseBrowser.from("recipes").update({ is_public: !current }).eq("id", id);

    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_public: !current } : r))
    );
  }

  


  async function deleteRecipe(id: string) {
    const res = await fetch("/api/recipes/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    }
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
  setEditMalts([...editMalts, { name: "", amount: "" }]);
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
  setEditHops([...editHops, { name: "", alpha: "", year: "", amount: "", time: "" }]);
}

function updateHop(index: number, key: keyof Hop, value: string) {
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
  setEditDryHops([...editDryHops, { name: "", amount: "", contact: "" }]);
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




  const filteredRecipes =
    filterType === "All"
      ? recipes
      : recipes.filter((r) => r.type?.toLowerCase() === filterType.toLowerCase());

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
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative pt-16 sm:pt-0">

        {/* TOP BAR */}
        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay />
        </div>

        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <BackButton />
        </div>

        <h1 className="text-4xl font-bold mb-6 text-center mt-6">My recipes</h1>
        <p className="opacity-80 text-center mb-10">All your recipes in one place.</p>

        {/* NEW RECIPE BUTTON */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setOpenStyleSelect(true)}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold"
          >
            New recipe
          </button>
        </div>

        {/* FILTER BAR */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {["All", "Mead", "Beer", "Cider", "Wine", "Seltzer", "Braggot", "Other"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-2 rounded-lg border text-sm ${
                filterType === t
                  ? "bg-green-700 border-green-500"
                  : "bg-white/10 border-white/20 hover:bg-white/20"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* RECIPE LIST */}
        <div className="space-y-4">
          {filteredRecipes.length > 0 ? (
            filteredRecipes.map((r) => {
              const og = r.og ? Number(r.og).toFixed(3) : "—";
              const fg = r.fg ? Number(r.fg).toFixed(3) : "—";
              const abv = r.abv ? Number(r.abv).toFixed(1) : "—";
              const ibu = r.ibu ? Number(r.ibu).toFixed(0) : "—";
              const ebc = Number(r.ebc);
              const volume = r.volume ?? "—";

              return (
                <div
  key={r.id}
  className={`bg-white/10 border border-white/20 rounded-xl p-4 sm:p-6 ${
    expanded === r.id ? "cursor-default" : "cursor-pointer"
  }`}
  onClick={() => {
    if (expanded !== r.id) toggle(r.id); // åpne kortet
  }}
>



{/* HEADER */}
<div
  className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
  onClick={(e) => {
    // PC: hele headeren lukker kortet
    if (expanded === r.id && window.innerWidth >= 640) {
      e.stopPropagation();
      toggle(r.id);
    }
  }}
>
  {/* Tittel */}
  <button
    onClick={(e) => {
      // Mobil: kun tittelen lukker kortet
      if (expanded === r.id && window.innerWidth < 640) {
        e.stopPropagation();
        toggle(r.id);
      }

      // PC: tittelen skal ikke åpne kortet alene
      if (window.innerWidth >= 640) {
        e.stopPropagation();
      }
    }}
    className="text-left flex items-center gap-3"
  >
    <span className="text-xl font-bold text-green-300 flex items-center gap-3">
      {r.name ? r.name.charAt(0).toUpperCase() + r.name.slice(1) : "Unnamed recipe"}
    </span>
  </button>

  {/* Knapper + pil (PC) */}
<div className="hidden sm:flex flex-row items-center justify-end gap-2 sm:mt-[6px]">

  {/* ⭐ EDIT RECIPE BUTTON */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      setEditRecipe(r);
      setEditFruits(r.fruits || []);
      setOpenEdit(r.id); 
      setHadSecondary(r.had_secondary || false);
      setSecondaryAdditions(r.secondary_additions || "");
      setSecondaryNotes(r.secondary_notes || "");
      setEditMalts(r.malts || []);
      setEditHops(r.hops || []);
      setEditDryHops(r.dry_hops || []);


        // åpner edit-modal for denne oppskriften
    }}
    className="px-4 py-2 rounded-lg font-semibold border bg-green-700 hover:bg-green-600 border-green-500"
  >
    Edit
  </button>

  <button
    onClick={(e) => {
      e.stopPropagation();
      togglePublic(r.id, r.is_public);
    }}
    className={`px-4 py-2 rounded-lg font-semibold border ${
      r.is_public
        ? "bg-green-600 hover:bg-green-700 border-green-400"
        : "bg-zinc-700 hover:bg-zinc-600 border-zinc-500"
    }`}
  >
    {r.is_public ? "Public" : "Private"}
  </button>

  <button
    onClick={(e) => {
      e.stopPropagation();
      setConfirmDeleteId(r.id);
    }}
    className="px-4 py-2 rounded-lg font-semibold border bg-red-700 hover:bg-red-600 border-red-500"
  >
    Delete
  </button>

  <span
    onClick={(e) => {
      e.stopPropagation();
    }}
    className={`text-white text-2xl transition-transform duration-200 ${
      expanded === r.id ? "rotate-90" : "rotate-180"
    }`}
  >
    ▶
  </span>
</div>

</div>
                  {/* Stats line */}
<p className="text-sm mt-3 grid grid-cols-3 gap-y-1 gap-x-4 sm:flex sm:flex-wrap sm:items-center">
  <span><strong>OG:</strong> {og}</span>
  <span><strong>FG:</strong> {fg}</span>

  {(r.type === "Beer" || r.type === "Braggot") && (
    <>
      <span><strong>IBU:</strong> {ibu}</span>
      <span><strong>EBC:</strong> {ebc !== null ? ebc.toFixed(0) : "—"}</span>

      {ebc > 0 && (
        <span
          className="inline-block w-4 h-4 rounded-md border border-white/20 shadow-sm"
          style={{ backgroundColor: ebcToHex(ebc) }}
        ></span>
      )}

    
    </>
  )}

  <span><strong>ABV:</strong> {abv}%</span>

  
</p>

{/* Mobil-knapper + pil */}
<div className="flex sm:hidden justify-between items-center mt-3">
  <div className="flex gap-2">
    <button
      onClick={(e) => {
        e.stopPropagation();
        togglePublic(r.id, r.is_public);
      }}
      className={`px-4 py-2 rounded-lg font-semibold border ${
        r.is_public
          ? "bg-green-600 hover:bg-green-700 border-green-400"
          : "bg-zinc-700 hover:bg-zinc-600 border-zinc-500"
      }`}
    >
      {r.is_public ? "Public" : "Private"}
    </button>

    <button
      onClick={(e) => {
        e.stopPropagation();
        setConfirmDeleteId(r.id);
      }}
      className="px-4 py-2 rounded-lg font-semibold border bg-red-700 hover:bg-red-600 border-red-500"
    >
      Delete
    </button>
  </div>

  <span
    className={`text-white text-2xl transition-transform duration-200 ${
      expanded === r.id ? "rotate-90" : "rotate-180"
    }`}
  >
    ▶
  </span>
</div>




                  {/* SLIDER CONTENT */}
                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      expanded === r.id ? "max-h-[2000px] mt-4" : "max-h-0"
                    }`}
                  >
                    <div className="space-y-3 opacity-90">

                      <p className="text-sm">
                        <strong>Volume:</strong> {volume} L
                      </p>

                      {/* TYPE-SPECIFIC */}
                      {r.type === "Mead" && (
                        <>
                          {r.honey_type && <p><strong>Honey type:</strong> {r.honey_type}</p>}
                          {r.honey_amount && <p><strong>Honey amount:</strong> {r.honey_amount} kg</p>}
                          {r.fruits?.length > 0 && (
                            <div>
                              <strong>Fruits:</strong>
                              <ul className="list-disc ml-6 opacity-80">
                                {r.fruits.map((f: any, i: number) => (
                                  <li key={i}>{f.name} — {f.amount} {f.unit}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}

                      {(r.type === "Beer" || r.type === "Braggot") && (
  <>
    <p className="text-xs opacity-60 mt-2">
      Note: If the IBU or EBC values differ from the recipe you imported,
      this is because Batchlogg uses more accurate brewing models
      (Tinseth for bitterness and Morey for color). Many recipe kits use
      simplified or inconsistent calculations, so their numbers may not match.
    </p>

    {r.malts?.length > 0 && (
      <div>
        <strong>Malts:</strong>
        <ul className="list-disc ml-6 opacity-80">
          {r.malts.map((m: any, i: number) => (
            <li key={i}>{m.name} — {m.amount} kg</li>
          ))}
        </ul>

        <p className="mt-2 opacity-80">
          <strong>Total malt:</strong>{" "}
          {r.malts.reduce((sum: number, m: any) => sum + Number(m.amount), 0).toFixed(2)} kg
        </p>
      </div>
    )}

    {r.hops?.length > 0 && (
  <div>
    <strong>Hops:</strong>
    <ul className="list-disc ml-6 opacity-80">
      {r.hops.map((h: any, i: number) => (
        <li key={i}>
          {h.name}  {h.amount} g @ {h.time} min
          {h.alpha && (
            <> - {Number(h.alpha)}% Alpha Acid</>
          )}
        </li>
      ))}
    </ul>

    <p className="mt-2 opacity-80">
      <strong>Total hops:</strong>{" "}
      {(
        r.hops.reduce((sum: number, h: any) => sum + Number(h.amount), 0) +
        (r.dry_hops?.reduce((sum: number, h: any) => sum + Number(h.amount), 0) || 0)
      ).toFixed(0)} g
    </p>
  </div>
)}

    {r.dry_hops?.length > 0 && (
      <div className="mt-3">
        <strong>Dry hops:</strong>
        <ul className="list-disc ml-6 opacity-80">
          {r.dry_hops.map((h: any, i: number) => (
            <li key={i}>{h.name} — {h.amount} g — {h.contact} days contact</li>
          ))}
        </ul>

        <p className="mt-2 opacity-80">
          <strong>Total dry hops:</strong>{" "}
          {r.dry_hops.reduce((sum: number, h: any) => sum + Number(h.amount), 0).toFixed(0)} g
        </p>
      </div>
    )}

    {r.boil_time && (
      <p><strong>Boil time:</strong> {r.boil_time} min</p>
    )}

    
  </>
)}


                      {(r.type === "Wine" || r.type === "Cider" || r.type === "Seltzer") && (
                        <>
                          {r.juice_type && <p><strong>Juice / Must:</strong> {r.juice_type}</p>}
                          {r.sugar_amount && <p><strong>Sugar added:</strong> {r.sugar_amount}</p>}
                        </>
                      )}

                      {r.type === "Other" && r.ingredients && (
                        <div>
                          <strong>Ingredients:</strong>
                          <ul className="list-disc ml-6 opacity-80">
                            {r.ingredients.map((ing: any, i: number) => (
                              <li key={i}>{ing.name} — {ing.amount} {ing.unit}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {r.steps?.length > 0 && (
                        <div>
                          <strong>Steps:</strong>
                          <ul className="list-disc ml-6 opacity-80">
                            {r.steps.map((s: string, i: number) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Shared */}
                      {r.yeast && <p><strong>Yeast:</strong> {r.yeast}</p>}
                      {r.additives && (
                        <p className="whitespace-pre-line">
                          <strong>Additives:</strong>{"\n"}{r.additives}
                        </p>
                      )}
                      {r.full_process && (
                        <p className="whitespace-pre-line">
                          <strong>Full process:</strong>{"\n"}{r.full_process}
                        </p>
                      )}
                      {r.notes && (
                        <p className="whitespace-pre-line">
                          <strong>Notes:</strong>{"\n"}{r.notes}
                        </p>
                      )}

                      {/* Secondary */}
                      {r.had_secondary && (
                        <div className="mt-6">
                          <h4 className="font-semibold text-white/90 mb-2">Secondary fermentation</h4>
                          {r.secondary_additions && (
                            <p className="whitespace-pre-line opacity-80">
                              <strong>Secondary additions:</strong>{"\n"}{r.secondary_additions}
                            </p>
                          )}
                          {r.secondary_notes && (
                            <p className="whitespace-pre-line opacity-80 mt-2">
                              <strong>Secondary notes:</strong>{"\n"}{r.secondary_notes}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Note log */}
                      {r.notes_log?.length > 0 && (
                        <div className="whitespace-pre-line">
                          <strong>Note log:</strong>{"\n"}
                          {r.notes_log.map((n: any) => `• ${n.note}`).join("\n")}
                        </div>
                      )}

                      <div className="flex justify-end pt-4">
                        <Link
                          href={`/recipes/${r.id}`}
                          className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold w-full sm:w-auto text-center"
                        >
                          Open note log →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="opacity-60 text-center">No recipes found.</p>
          )}
        </div>

          {openEdit && editRecipe && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">

    <div
      className="bg-zinc-900 border border-white/20 p-6 rounded-xl w-full max-w-2xl text-white overflow-y-auto max-h-[90vh]"
      onClick={(e) => e.stopPropagation()}
    >

      <h2 className="text-2xl font-bold mb-4">Edit recipe</h2>

      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();

          const formData = new FormData(e.currentTarget);
          const payload = Object.fromEntries(formData.entries());

          await fetch("/api/recipes/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: openEdit, ...payload }),
          });

          

          setOpenEdit(null);
          window.location.reload();
        }}
      >

        <input type="hidden" name="type" value={editRecipe.type} />


        {/* COMMON FIELDS */}
        <label className="font-semibold">Name</label>
        <input
          name="name"
          defaultValue={editRecipe.name}
          className="p-3 rounded bg-black/40 border border-white/20"
        />

        <label className="font-semibold">Volume (L)</label>
        <input
          name="volume"
          type="text"
          defaultValue={editRecipe.volume}
          className="p-3 rounded bg-black/40 border border-white/20"
        />

        <label className="font-semibold">OG</label>
        <input
          name="og"
          type="text"
          defaultValue={editRecipe.og}
          className="p-3 rounded bg-black/40 border border-white/20"
        />

        <label className="font-semibold">FG</label>
        <input
          name="fg"
          type="text"
          defaultValue={editRecipe.fg}
          className="p-3 rounded bg-black/40 border border-white/20"
        />

        <label className="font-semibold">Yeast</label>
        <input
          name="yeast"
          defaultValue={editRecipe.yeast}
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

    <label className="block mb-2 font-semibold">Honey amount (kg)</label>
    <input
      name="honey_amount"
      type="text"
      defaultValue={editRecipe.honey_amount}
      className="p-3 rounded bg-black/40 border border-white/20"
    />

    {/* ⭐ Fruits — identisk med batch creation */}
    <label className="block mb-2 font-semibold">Fruit additions</label>

    {editFruits.map((f, i) => (
      <div
        key={i}
        className="flex flex-col md:flex-row md:items-center gap-2 mb-2 w-full"
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
          className="px-3 py-2 bg-red-700/70 hover:bg-red-600/70 border border-red-500/50 rounded-lg text-sm self-start md:self-auto"
        >
          Remove
        </button>
      </div>
    ))}

    <button
      type="button"
      onClick={addFruit}
      className="px-4 py-2 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold mt-2"
    >
      + Add fruit
    </button>
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

            <label className="font-semibold">Sugar added</label>
            <input
              name="sugar_amount"
              defaultValue={editRecipe.sugar_amount}
              className="p-3 rounded bg-black/40 border border-white/20"
            />
          </>
        )}

        {editRecipe.type === "Seltzer" && (
  <>
    <label className="font-semibold">Sugar added</label>
    <input
      name="sugar_amount"
      defaultValue={editRecipe.sugar_amount}
      className="p-3 rounded bg-black/40 border border-white/20"
    />
  </>
)}


        {(editRecipe.type === "Beer" || editRecipe.type === "Braggot") && (
  <>
    {/* Boil Volume */}
          <div>
            <label className="block mb-1 font-semibold">Boil Volume (L)</label>
            <input
              name="boil_volume"
              type="text"
              defaultValue={editRecipe.boil_volume}
              placeholder="Total wort volume before the boil"
              className="w-full p-3 rounded bg-black/40 border border-white/20"
            />
          </div>
    
    {/* MALTS */}
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
            placeholder="Amount (kg)"
            type="text"
            className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-32"
            value={m.amount}
            onChange={(e) => updateMalt(i, "amount", e.target.value)}
          />

          <button
            type="button"
            onClick={() => removeMalt(i)}
            className="px-3 py-2 bg-red-700/70 hover:bg-red-600/70 border border-red-500/50 rounded-lg text-sm"
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

    {/* HOPS */}
    <div>
      <label className="block mb-2 font-semibold">Hop additions</label>

      {editHops.map((h, i) => (
        <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 mb-2 w-full">

          <input
            placeholder="Hop type"
            className="p-3 rounded bg-black/40 border border-white/20 w-full md:flex-1"
            value={h.name}
            onChange={(e) => updateHop(i, "name", e.target.value)}
          />

          <input
            placeholder="Alpha (%)"
            className="p-3 rounded bg-black/40 border border-white/20 w-24"
            value={h.alpha}
            onChange={(e) => updateHop(i, "alpha", e.target.value)}
          />

          <input
            placeholder="Year"
            className="p-3 rounded bg-black/40 border border-white/20 w-24"
            value={h.year}
            onChange={(e) => updateHop(i, "year", e.target.value)}
          />

          <input
            placeholder="Amount (g)"
            className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-28"
            value={h.amount}
            onChange={(e) => updateHop(i, "amount", e.target.value)}
          />

          <input
            placeholder="Boil time (min)"
            className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-32"
            value={h.time}
            onChange={(e) => updateHop(i, "time", e.target.value)}
          />

          <button
            type="button"
            onClick={() => removeHop(i)}
            className="px-3 py-2 bg-red-700/70 hover:bg-red-600/70 border border-red-500/50 rounded-lg text-sm"
          >
            Remove
          </button>
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

    {/* DRY HOPS */}
    <div>
      <label className="block mb-2 font-semibold">Dry hop additions</label>

      {editDryHops.map((h, i) => (
        <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 mb-2 w-full">

          <input
            placeholder="Hop type"
            className="p-3 rounded bg-black/40 border border-white/20 w-full md:flex-1"
            value={h.name}
            onChange={(e) => updateDryHop(i, "name", e.target.value)}
          />

          <input
            placeholder="Amount (g)"
            className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-28"
            value={h.amount}
            onChange={(e) => updateDryHop(i, "amount", e.target.value)}
          />

          <input
            placeholder="Contact time (days)"
            className="p-3 rounded bg-black/40 border border-white/20 w-full md:w-32"
            value={h.contact}
            onChange={(e) => updateDryHop(i, "contact", e.target.value)}
          />

          <button
            type="button"
            onClick={() => removeDryHop(i)}
            className="px-3 py-2 bg-red-700/70 hover:bg-red-600/70 border border-red-500/50 rounded-lg text-sm"
          >
            Remove
          </button>
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


    {/* Boil time */}
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


        {editRecipe.type === "Other" && (
          <>
            <label className="font-semibold">Ingredients (JSON)</label>
            <input
  name="other_boil_time"
  type="number"
  defaultValue={editRecipe.boil_time}
  className="w-full p-3 rounded bg-black/40 border border-white/20"
/>
          </>
        )}

        {/* Shared fields */}
        <label className="font-semibold">Additives</label>
        <textarea
          name="additives"
          defaultValue={editRecipe.additives}
          className="p-3 rounded bg-black/40 border border-white/20"
        />

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

        {/* Secondary fermentation toggle */}
<div>
  <label className="block mb-2 font-semibold">Secondary fermentation</label>

  <button
    type="button"
    onClick={() => setHadSecondary(!hadSecondary)}
    className={`px-4 py-2 rounded-lg border ${
      hadSecondary
        ? "bg-purple-700 border-purple-500"
        : "bg-black/40 border-white/20"
    }`}
  >
    {hadSecondary ? "Secondary enabled" : "Enable secondary"}
  </button>
</div>

{/* Secondary fields */}
{hadSecondary && (
  <div className="flex flex-col gap-4">

    <div>
      <label className="block mb-1 font-semibold">Secondary additions</label>
      <textarea
        name="secondary_additions"
        placeholder="Fruit additions, spices, oak, etc..."
        className="w-full p-3 rounded bg-black/40 border border-white/20 h-28"
        value={secondaryAdditions}
        onChange={(e) => setSecondaryAdditions(e.target.value)}
      />
    </div>

    <div>
      <label className="block mb-1 font-semibold">Secondary notes</label>
      <textarea
        name="secondary_notes"
        placeholder="Notes about racking, stabilization, clearing..."
        className="w-full p-3 rounded bg-black/40 border border-white/20 h-28"
        value={secondaryNotes}
        onChange={(e) => setSecondaryNotes(e.target.value)}
      />
    </div>
  </div>
)}

<input type="hidden" name="had_secondary" value={hadSecondary ? "true" : "false"} />


        <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
          Save changes
        </button>
      </form>

      <button
        onClick={() => setOpenEdit(null)}
        className="mt-4 w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 border border-zinc-500 rounded-lg font-semibold"
      >
        Cancel
      </button>
    </div>
  </div>
)}

        {/* DELETE CONFIRMATION */}
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-white/20 p-6 rounded-xl w-full max-w-sm text-white">
              <h2 className="text-xl font-bold mb-4">Delete recipe?</h2>
              <p className="opacity-80 mb-6">
                Are you sure you want to delete this recipe? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 border border-zinc-500 rounded-lg font-semibold"
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    await deleteRecipe(confirmDeleteId);
                    setConfirmDeleteId(null);
                  }}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 border border-red-500 rounded-lg font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STYLE SELECT MODAL */}
        {openStyleSelect && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setOpenStyleSelect(false)}
          >
            <div
              className="bg-black/60 p-6 rounded-xl border border-white/10 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-center mb-6">Choose recipe type</h2>

              <div className="flex flex-col gap-4">
                {["Mead", "Beer", "Cider", "Wine", "Seltzer", "Braggot", "Other"].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      window.location.href = `/recipes/new/${type.toLowerCase()}`;
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
          </div>
        )}

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Batchlog
        </p>
      </div>
    </main>
  );
}
