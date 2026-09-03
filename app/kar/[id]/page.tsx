"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as Actions from "./actions";
import NextDynamic from "next/dynamic";
import { KarNotesClient } from "./KarNotesClient";
import MenuOverlay from "@/app/components/MenuOverlay";

const RecipeEditor = NextDynamic(
  () => import("./RecipeEditor").then((mod) => mod.RecipeEditor),
  { ssr: false }
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function daysSince(dateString: string) {
  const start = new Date(dateString);
  const now = new Date();

  const diffMs = now.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return days;
}

function dayLabel(days: number) {
  return days === 1 ? "day" : "days";
}


export default function KarPage({ params }: { params: { id: string } }) {
  const [openSecondary, setOpenSecondary] = useState(false);
  const [openSecondaryActive, setOpenSecondaryActive] = useState(false);
  const [openFinish, setOpenFinish] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [kar, setKar] = useState<any>(null);
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [historyBatch, setHistoryBatch] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openImport, setOpenImport] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [openEdit, setOpenEdit] = useState(false);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  useEffect(() => {
  if (!user) return;

  supabase
    .from("recipes")
    .select("*")
    .or(`user_id.eq.${user.id}, is_public.eq.true`)
    .order("created_at", { ascending: false })
    .then(({ data }) => setRecipes(data ?? []));
  }, [user]);


  useEffect(() => {
    if (!user) return;
    supabase
      .from("kar")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data }) => setKar(data));
  }, [user, params.id]);

  useEffect(() => {
    if (!kar) return;
    supabase
      .from("batches")
      .select("*")
      .eq("aktivt_kar", kar.id)
      .in("status", ["Aktiv", "Sekundær"])
      .order("created_at", { ascending: false })
      .maybeSingle()
      .then(({ data }) => setActiveBatch(data));
  }, [kar]);

  useEffect(() => {
    if (!kar || activeBatch) return;
    supabase
      .from("batches")
      .select("*")
      .eq("user_id", kar.user_id)
      .order("finished_date", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setHistoryBatch(data));
  }, [kar, activeBatch]);

  useEffect(() => {
    if (!activeBatch) return;
    supabase
      .from("batch_notes")
      .select("*")
      .eq("batch_id", activeBatch.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setNotes(data ?? []));
  }, [activeBatch]);

  useEffect(() => {
    if (user !== null && kar !== null) {
      setLoading(false);
    }
  }, [user, kar]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Loading...</h1>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">You must be logged in</h1>
      </main>
    );
  }

  if (!kar) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Vessel not found</h1>
      </main>
    );
  }

  const isOwner = kar.user_id === user.id;
  const hasActive = !!activeBatch;
  const hasHistory = !!historyBatch;

  // ⭐ NEW: Toggle visibility for this vessel
async function toggleVisibility() {
  const newValue = !kar.is_public;

  const form = new FormData();
  form.append("id", kar.id);
  form.append("is_public", String(newValue));

  await fetch("/api/kar/visibility", {
    method: "POST",
    body: form,
  });

  setKar((prev: any) => ({ ...prev, is_public: newValue }));
}


  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => window.history.back()}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19l-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </button>

          <MenuOverlay current="kar" />
        </div>

        {/* ⭐ VESSEL VISIBILITY SLIDER */}
{isOwner && (
  <div className="flex items-center justify-center gap-4 mb-10">
    <p className="text-sm opacity-80">Vessel Visibility</p>

    <div
      onClick={toggleVisibility}
      className={`w-14 h-7 rounded-full cursor-pointer transition relative ${
        kar.is_public ? "bg-green-500" : "bg-zinc-600"
      }`}
    >
      <div
        className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition ${
          kar.is_public ? "translate-x-7" : ""
        }`}
      ></div>
    </div>

    <p className="text-sm opacity-80">
      {kar.is_public ? "visible" : "hidden"}
    </p>
  </div>
)}


        {/* EMPTY VESSEL */}
        {!hasActive && (
          <>
            {isOwner && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl mb-10">
                <h2 className="text-2xl font-semibold mb-4 text-center">
                  Start new batch
                </h2>

                <form action={Actions.createBatch} className="flex flex-col gap-6">
                  <input type="hidden" name="kar" value={kar.id} />

                  <div>
                    <label className="block mb-1 font-semibold">Batch name</label>
                    <input
                      name="name"
                      placeholder="Batch name"
                      className="w-full p-3 rounded bg-black/40 border border-white/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-1 font-semibold">Volume (L)</label>
                    <input
                      name="volume_l"
                      type="number"
                      step="0.1"
                      placeholder="Volume (L)"
                      className="w-full p-3 rounded bg-black/40 border border-white/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-1 font-semibold">Start date</label>
                    <input
                      name="startdato"
                      type="date"
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="w-full p-3 rounded bg-black/40 border border-white/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-1 font-semibold">
                      Original Gravity (OG)
                    </label>
                    <input
                      name="og"
                      type="number"
                      step="0.001"
                      placeholder="OG"
                      className="w-full p-3 rounded bg-black/40 border border-white/20"
                      required
                    />
                  </div>

                  <RecipeEditor />

                  <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
                    Start batch
                  </button>

                  
                </form>
              </div>
            )}
          </>
        )}
        {/* SECONDARY FERMENTATION */}
        {hasActive && activeBatch?.status === "Sekundær" && (
          <>
            <h2 className="text-2xl font-semibold mb-4 text-center">
              Secondary fermentation
            </h2>

            <div className="p-4 bg-white/10 border border-white/20 rounded-xl mb-10">
              <div className="flex items-center justify-between mb-2">
  <h3 className="text-xl font-bold text-green-300">
    {activeBatch.name}
  </h3>

  {isOwner && (
    <button
      type="button"
      onClick={() => setOpenEdit(!openEdit)}
      className="font-semibold text-green-300 cursor-pointer"
    >
      Edit batch
    </button>
  )}
</div>

{openEdit && (
  <div className="p-4 bg-white/5 border border-white/10 rounded-lg mb-4">
    <form action={Actions.updateBatch} className="flex flex-col gap-4">
      <input type="hidden" name="batch_id" value={activeBatch.id} />
      <input type="hidden" name="kar_id" value={kar.id} />

      <div>
        <label className="block mb-1 font-semibold">Batch name</label>
        <input
          name="name"
          defaultValue={activeBatch.name}
          className="w-full p-3 rounded bg-black/40 border border-white/20"
          required
        />
      </div>

      <div>
        <label className="block mb-1 font-semibold">Volume (L)</label>
        <input
          name="volume_l"
          type="number"
          step="0.1"
          defaultValue={activeBatch.volume_l}
          className="w-full p-3 rounded bg-black/40 border border-white/20"
          required
        />
      </div>

      <div>
        <label className="block mb-1 font-semibold">Start date</label>
        <input
          name="startdato"
          type="date"
          defaultValue={activeBatch.startdato.split("T")[0]}
          className="w-full p-3 rounded bg-black/40 border border-white/20"
          required
        />
      </div>

      <div>
        <label className="block mb-1 font-semibold">Original Gravity (OG)</label>
        <input
          name="og"
          type="number"
          step="0.001"
          defaultValue={activeBatch.og}
          className="w-full p-3 rounded bg-black/40 border border-white/20"
          required
        />
      </div>

      {/* ⭐ Secondary additions */}
      <div>
        <label className="block mb-1 font-semibold">Secondary additions</label>
        <textarea
          name="secondary_additions"
          defaultValue={activeBatch.secondary_additions || ""}
          className="w-full p-3 rounded bg-black/40 border border-white/20"
        />
      </div>

      {/* ⭐ Secondary notes */}
      <div>
        <label className="block mb-1 font-semibold">Secondary notes</label>
        <textarea
          name="secondary_notes"
          defaultValue={activeBatch.secondary_notes || ""}
          className="w-full p-3 rounded bg-black/40 border border-white/20"
        />
      </div>

      <RecipeEditor initialValue={activeBatch.oppskrift} />

      <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
        Save changes
      </button>
    </form>
  </div>
)}


              <p className="opacity-80">Batch ID: {activeBatch.batchnummer}</p>
              <p className="opacity-80">
                Start date: {new Date(activeBatch.startdato).toLocaleDateString("en-US")}
                <span className="ml-2 opacity-70">
                  ({daysSince(activeBatch.startdato)} {dayLabel(daysSince(activeBatch.startdato))})
                </span>
              </p>

              <p className="opacity-80">Batch volume: {activeBatch.volume_l} L</p>
              <p className="opacity-80">Original Gravity (OG): {activeBatch.og}</p>

              <p className="opacity-80 mt-2">
                Racked to secondary on{" "}
                {new Date(activeBatch.secondary_startdate).toLocaleDateString("en-US")}
              </p>

              {activeBatch.secondary_additions && (
                <p className="opacity-80 mt-2 whitespace-pre-wrap">
                  Secondary additions:<br />
                  {activeBatch.secondary_additions}
                </p>
              )}

              {activeBatch.secondary_notes && (
                <p className="opacity-80 mt-2 whitespace-pre-wrap">
                  Secondary notes:<br />
                  {activeBatch.secondary_notes}
                </p>
              )}

              <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg">
                <h3 className="text-xl font-bold mb-3 text-green-300">
                  Brew sheet
                </h3>

                <div className="space-y-4 text-sm whitespace-pre-wrap">
                  <div>
                    <h4 className="font-semibold text-white/90 mb-1">
                      Full Recipe
                    </h4>
                    <p className="opacity-80">
                      {activeBatch.oppskrift
                        .split("Ingredients:")[1]
                        ?.split("Full process:")[0]
                        ?.trim()}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white/90 mb-1">
                      Full Process
                    </h4>
                    <p className="opacity-80">
                      {activeBatch.oppskrift
                        .split("Full process:")[1]
                        ?.split("Notes:")[0]
                        ?.trim()}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white/90 mb-1">
                      Recipe notes
                    </h4>
                    <p className="opacity-80">
                      {activeBatch.oppskrift.split("Notes:")[1]?.trim()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rack to secondary REMOVED in secondary */}

            {/* Finish batch */}
            {isOwner && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-6">
                <button
                  type="button"
                  onClick={() => setOpenFinish(!openFinish)}
                  className="w-full flex items-center justify-between font-semibold text-green-300 cursor-pointer"
                >
                  Finish batch
                  <span
                    className={`text-white text-xl transition-transform duration-300 ${
                      openFinish ? "rotate-90" : "rotate-180"
                    }`}
                  >
                    ▶
                  </span>
                </button>

                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    openFinish ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <form
                      action={Actions.finishBatch}
                      className="mt-4 flex flex-col gap-4"
                    >
                      <input type="hidden" name="batch_id" value={activeBatch.id} />
                      <input type="hidden" name="kar_id" value={kar.id} />

                      <input
                        type="number"
                        step="0.001"
                        name="fg"
                        placeholder="Final Gravity (FG)"
                        className="p-3 rounded bg-black/40 border border-white/20"
                        required
                      />

                      <textarea
                        name="finished_notes"
                        placeholder="Finishing notes"
                        className="p-3 rounded bg-black/40 border border-white/20"
                      />

                      <label className="flex items-center gap-2 text-sm opacity-80">
                        <input type="checkbox" name="save_as_recipe" />
                        Save as recipe
                      </label>

                      <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
                        Finish batch
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Cancel batch */}
            {isOwner && (
              <>
                <form action={Actions.cancelBatch} className="mt-8 mb-4">
                  <input type="hidden" name="batch_id" value={activeBatch.id} />
                  <input type="hidden" name="kar_id" value={kar.id} />

                  <button className="w-full px-2 py-2 bg-red-700/70 hover:bg-red-600/70 border border-red-500/50 rounded-md text-sm">
                    Cancel batch
                  </button>
                </form>

                <div className="w-full h-px bg-white/10 my-6"></div>
              </>
            )}

            <KarNotesClient
              batchId={activeBatch.id}
              karId={kar.id}
              userId={user.id}
              notes={notes}
            />
          </>
        )}
        {/* PRIMARY FERMENTATION */}
        {hasActive && activeBatch?.status === "Aktiv" && (
          <>
            <h2 className="text-2xl font-semibold mb-4 text-center">
              Primary fermentation
            </h2>

            <div className="p-4 bg-white/10 border border-white/20 rounded-xl mb-10">
              <div className="flex items-center justify-between mb-2">
  <h3 className="text-xl font-bold text-green-300">
    {activeBatch.name}
  </h3>

  {isOwner && (
    <button
      type="button"
      onClick={() => setOpenEdit(!openEdit)}
      className="font-semibold text-green-300 cursor-pointer"
    >
      Edit batch
    </button>
  )}
</div>

{openEdit && (
  <div className="p-4 bg-white/5 border border-white/10 rounded-lg mb-4">
    <form action={Actions.updateBatch} className="flex flex-col gap-4">
      <input type="hidden" name="batch_id" value={activeBatch.id} />
      <input type="hidden" name="kar_id" value={kar.id} />

      <label className="font-semibold">Batch name</label>
      <input
        name="name"
        defaultValue={activeBatch.name}
        className="p-3 rounded bg-black/40 border border-white/20"
      />

      <label className="font-semibold">Volume (L)</label>
      <input
        name="volume_l"
        type="number"
        step="0.1"
        defaultValue={activeBatch.volume_l}
        className="p-3 rounded bg-black/40 border border-white/20"
      />

      <label className="font-semibold">Start date</label>
      <input
        name="startdato"
        type="date"
        defaultValue={activeBatch.startdato.split("T")[0]}
        className="p-3 rounded bg-black/40 border border-white/20"
      />

      <label className="font-semibold">Original Gravity (OG)</label>
      <input
        name="og"
        type="number"
        step="0.001"
        defaultValue={activeBatch.og}
        className="p-3 rounded bg-black/40 border border-white/20"
      />

      <RecipeEditor initialValue={activeBatch.oppskrift} />

      <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
        Save changes
      </button>
    </form>
  </div>
)}

            
              <p className="opacity-80">Batch ID: {activeBatch.batchnummer}</p>
              <p className="opacity-80">
                Start date: {new Date(activeBatch.startdato).toLocaleDateString("en-US")}
                <span className="ml-2 opacity-70">
                  ({daysSince(activeBatch.startdato)} {dayLabel(daysSince(activeBatch.startdato))})
                </span>
              </p>
              <p className="opacity-80">Original Gravity (OG): {activeBatch.og}</p>
              <p className="opacity-80">Batch volume: {activeBatch.volume_l} L</p>
              <p className="opacity-80">Status: Primary fermentation</p>

              <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg">
                <h3 className="text-xl font-bold mb-3 text-green-300">
                  Recipe
                </h3>

                <div className="space-y-4 text-sm whitespace-pre-wrap">
                  <div>
                    <h4 className="font-semibold text-white/90 mb-1">
                      Ingredients
                    </h4>
                    <p className="opacity-80">
                      {activeBatch.oppskrift
                        .split("Ingredients:")[1]
                        ?.split("Full process:")[0]
                        ?.trim()}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white/90 mb-1">
                      Full Process
                    </h4>
                    <p className="opacity-80">
                      {activeBatch.oppskrift
                        .split("Full process:")[1]
                        ?.split("Notes:")[0]
                        ?.trim()}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white/90 mb-1">
                      Recipe notes
                    </h4>
                    <p className="opacity-80">
                      {activeBatch.oppskrift.split("Notes:")[1]?.trim()}
                    </p>
                  </div>
                </div>
              </div>

              <p className="opacity-80 mt-4">
                Created: {new Date(activeBatch.created_at).toLocaleDateString("en-US")}
              </p>

              {activeBatch.secondary_startdate && (
                <p className="opacity-80 mt-2">
                  Racked to secondary on{" "}
                  {new Date(activeBatch.secondary_startdate).toLocaleDateString("en-US")}
                </p>
              )}

              {activeBatch.secondary_notes && (
                <p className="opacity-80 mt-2 whitespace-pre-wrap">
                  Secondary notes:<br />
                  {activeBatch.secondary_notes}
                </p>
              )}

              {activeBatch.secondary_additions && (
                <p className="opacity-80 mt-2 whitespace-pre-wrap">
                  Secondary additions:<br />
                  {activeBatch.secondary_additions}
                </p>
              )}

              {activeBatch.fg && (
                <p className="opacity-80 mt-2">Final Gravity (FG): {activeBatch.fg}</p>
              )}

              {activeBatch.abv && (
                <p className="opacity-80 mt-2">
                  ABV: {activeBatch.abv.toFixed(2)}%
                </p>
              )}

              {activeBatch.finished_date && (
                <p className="opacity-80 mt-2">
                  Finished:{" "}
                  {new Date(activeBatch.finished_date).toLocaleDateString("en-US")}
                </p>
              )}

              {activeBatch.finished_notes && (
                <p className="opacity-80 mt-2 whitespace-pre-wrap">
                  Finish notes:<br />
                  {activeBatch.finished_notes}
                </p>
              )}
            </div>

            {/* Rack to secondary */}
            {isOwner && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <button
                  type="button"
                  onClick={() => setOpenSecondaryActive(!openSecondaryActive)}
                  className="w-full flex items-center justify-between font-semibold text-green-300 cursor-pointer"
                >
                  Rack to secondary
                  <span
                    className={`text-white text-xl transition-transform duration-300 ${
                      openSecondaryActive ? "rotate-90" : "rotate-180"
                    }`}
                  >
                    ▶
                  </span>
                </button>

                                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    openSecondaryActive
                      ? "[grid-template-rows:1fr]"
                      : "[grid-template-rows:0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <form
                      action={Actions.moveToSecondary}
                      className="mt-4 flex flex-col gap-4"
                    >
                      <input type="hidden" name="batch_id" value={activeBatch.id} />
                      <input type="hidden" name="kar_id" value={kar.id} />

                      <textarea
                        name="secondary_additions"
                        placeholder="Secondary additions"
                        className="p-3 rounded bg-black/40 border border-white/20"
                      />

                      <textarea
                        name="secondary_notes"
                        placeholder="Secondary notes"
                        className="p-3 rounded bg-black/40 border border-white/20"
                      />

                      <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
                        Confirm rack to secondary
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Finish batch under Rack to secondary */}
            {isOwner && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-6">
                <button
                  type="button"
                  onClick={() => setOpenFinish(!openFinish)}
                  className="w-full flex items-center justify-between font-semibold text-green-300 cursor-pointer"
                >
                  Finish batch
                  <span
                    className={`text-white text-xl transition-transform duration-300 ${
                      openFinish ? "rotate-90" : "rotate-180"
                    }`}
                  >
                    ▶
                  </span>
                </button>

                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    openFinish ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <form
                      action={Actions.finishBatch}
                      className="mt-4 flex flex-col gap-4"
                    >
                      <input type="hidden" name="batch_id" value={activeBatch.id} />
                      <input type="hidden" name="kar_id" value={kar.id} />

                      <input
                        type="number"
                        step="0.001"
                        name="fg"
                        placeholder="Final Gravity (FG)"
                        className="p-3 rounded bg-black/40 border border-white/20"
                        required
                      />

                      <textarea
                        name="finished_notes"
                        placeholder="Finishing notes"
                        className="p-3 rounded bg-black/40 border border-white/20"
                      />

                      <label className="flex items-center gap-2 text-sm opacity-80">
                        <input type="checkbox" name="save_as_recipe" />
                        Save as recipe
                      </label>

                      <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
                        Finish batch
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Cancel batch */}
            {isOwner && (
              <>
                <form action={Actions.cancelBatch} className="mt-8 mb-4">
                  <input type="hidden" name="batch_id" value={activeBatch.id} />
                  <input type="hidden" name="kar_id" value={kar.id} />

                  <button className="w-full px-2 py-2 bg-red-700/70 hover:bg-red-600/70 border border-red-500/50 rounded-md text-sm">
                    Cancel batch
                  </button>
                </form>

                <div className="w-full h-px bg-white/10 my-6"></div>
              </>
            )}

            <KarNotesClient
              batchId={activeBatch.id}
              karId={kar.id}
              userId={user.id}
              notes={notes}
            />
          </>
        )}
        {/* LAST FINISHED BATCH */}
        {!hasActive && hasHistory && (
          <>
            <h2 className="text-2xl font-semibold mb-4 text-center">
              Last finished batch
            </h2>

            <div className="p-4 bg-white/10 border border-white/20 rounded-xl mb-10">
              <h3 className="text-xl font-bold text-green-300 mb-2">
                {historyBatch.name}
              </h3>

              {historyBatch.finished_date && (
                <p className="opacity-80 mt-2">
                  Finished:{" "}
                  {new Date(historyBatch.finished_date).toLocaleDateString("en-US")}
                </p>
              )}

              {historyBatch.finished_notes && (
                <p className="opacity-80 mt-2 whitespace-pre-wrap">
                  Finish notes:<br />
                  {historyBatch.finished_notes}
                </p>
              )}
            </div>
          </>
        )}

      </div>
    </main>
  );
}
