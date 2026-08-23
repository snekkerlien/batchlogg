"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";


import * as Actions from "./actions";
import NextDynamic from "next/dynamic";
import { KarNotesClient } from "./KarNotesClient";

const RecipeEditor = NextDynamic(
  () => import("./RecipeEditor").then((mod) => mod.RecipeEditor),
  { ssr: false }
);

// ⭐ Supabase-klient for frontend (valg B)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function KarPage({ params }: { params: { id: string } }) {
  // ⭐ UI-state (valg 1)
  const [openSecondary, setOpenSecondary] = useState(false);
  const [openSecondaryActive, setOpenSecondaryActive] = useState(false);

  // ⭐ Data-state
  const [user, setUser] = useState<any>(null);
  const [kar, setKar] = useState<any>(null);
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [historyBatch, setHistoryBatch] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ⭐ Hent bruker
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  // ⭐ Hent kar
  useEffect(() => {
    if (!user) return;
    supabase
      .from("kar")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data }) => setKar(data));
  }, [user, params.id]);

  // ⭐ Hent aktiv batch
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

  // ⭐ Hent historisk batch hvis ingen aktiv
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

  // ⭐ Hent notater for aktiv batch
  useEffect(() => {
    if (!activeBatch) return;
    supabase
      .from("batch_notes")
      .select("*")
      .eq("batch_id", activeBatch.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setNotes(data ?? []));
  }, [activeBatch]);

  // ⭐ Loading-state
  useEffect(() => {
    if (user !== null && kar !== null) {
      setLoading(false);
    }
  }, [user, kar]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Laster...</h1>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Du må være innlogget</h1>
      </main>
    );
  }

  if (!kar) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Kar ikke funnet</h1>
      </main>
    );
  }

  const isOwner = kar.user_id === user.id;
  const hasActive = !!activeBatch;
  const hasHistory = !!historyBatch;

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative">

        {/* Tilbake */}
        <div className="absolute top-4 left-4">
          <a
            href="/dashboard"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            ← Tilbake
          </a>
        </div>

        <h1 className="text-4xl font-bold mb-6 text-center">
          Kar {kar.displayNummer}
        </h1>
        {/* LEDIG KAR */}
        {!hasActive && (
          <>
            <p className="text-center opacity-70 mb-10">
              Dette karet er ledig.
            </p>

            {isOwner && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl mb-10">
                <h2 className="text-2xl font-semibold mb-4 text-center">
                  Start ny batch
                </h2>

                <form action={Actions.createBatch} className="flex flex-col gap-6">
                  <input type="hidden" name="kar" value={kar.id} />

                  <div>
                    <label className="block mb-1 font-semibold">Batchnavn</label>
                    <input
                      name="name"
                      placeholder="Batchnavn"
                      className="w-full p-3 rounded bg-black/40 border border-white/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-1 font-semibold">Volum (L)</label>
                    <input
                      name="volume_l"
                      type="number"
                      step="0.1"
                      placeholder="Volum (L)"
                      className="w-full p-3 rounded bg-black/40 border border-white/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-1 font-semibold">Startdato</label>
                    <input
                      name="startdato"
                      type="date"
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="w-full p-3 rounded bg-black/40 border border-white/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-1 font-semibold">OG (Original Gravity)</label>
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

        {/* SEKUNDÆR FERMENTERING */}
        {hasActive && activeBatch?.status === "Sekundær" && (
          <>
            <h2 className="text-2xl font-semibold mb-4 text-center">
              Sekundær fermentering
            </h2>

            <div className="p-4 bg-white/10 border border-white/20 rounded-xl mb-10">
              <h3 className="text-xl font-bold text-green-300 mb-2">
                {activeBatch.name}
              </h3>

              <p className="opacity-80">Batchnummer: {activeBatch.batchnummer}</p>
              <p className="opacity-80">Startdato: {activeBatch.startdato}</p>
              <p className="opacity-80">Volum: {activeBatch.volume_l} L</p>
              <p className="opacity-80">OG: {activeBatch.og}</p>

              <p className="opacity-80 mt-2">
                Sekundær siden:{" "}
                {new Date(activeBatch.secondary_startdate).toLocaleDateString("no-NO")}
              </p>

              {activeBatch.secondary_additions && (
                <p className="opacity-80 mt-2 whitespace-pre-wrap">
                  Tilsetninger:<br />{activeBatch.secondary_additions}
                </p>
              )}

              {activeBatch.secondary_notes && (
                <p className="opacity-80 mt-2 whitespace-pre-wrap">
                  Notater:<br />{activeBatch.secondary_notes}
                </p>
              )}

              {/* Oppskrift */}
              <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg">
                <h3 className="text-xl font-bold mb-3 text-green-300">Oppskrift</h3>

                <div className="space-y-4 text-sm whitespace-pre-wrap">
                  <div>
                    <h4 className="font-semibold text-white/90 mb-1">Ingredienser</h4>
                    <p className="opacity-80">
                      {activeBatch.oppskrift.split("Ingredienser:")[1]?.split("Fremgangsmåte:")[0]?.trim()}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white/90 mb-1">Fremgangsmåte</h4>
                    <p className="opacity-80">
                      {activeBatch.oppskrift.split("Fremgangsmåte:")[1]?.split("Notater:")[0]?.trim()}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white/90 mb-1">Notater</h4>
                    <p className="opacity-80">
                      {activeBatch.oppskrift.split("Notater:")[1]?.trim()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ⭐ Slide-down uten <details> */}
            {isOwner && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <button
                  type="button"
                  onClick={() => setOpenSecondary(!openSecondary)}
                  className="w-full flex items-center justify-between font-semibold text-green-300 cursor-pointer"
                >
                  Overfør til sekundær
                  <span
                    className={`text-white text-xl transition-transform duration-300 ${
                      openSecondary ? "rotate-90" : "rotate-180"
                    }`}
                  >
                    ▶
                  </span>
                </button>

                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    openSecondary ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
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
                        placeholder="Tilsetninger"
                        className="p-3 rounded bg-black/40 border border-white/20"
                      />

                      <textarea
                        name="secondary_notes"
                        placeholder="Notater"
                        className="p-3 rounded bg-black/40 border border-white/20"
                      />

                      <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
                        Overfør til sekundær
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Kanseller */}
            {isOwner && (
              <>
                <form action={Actions.cancelBatch} className="mt-8 mb-4">
                  <input type="hidden" name="batch_id" value={activeBatch.id} />
                  <input type="hidden" name="kar_id" value={kar.id} />
                  <button className="w-full px-2 py-2 bg-red-700/70 hover:bg-red-600/70 border border-red-500/50 rounded-md text-sm">
                    Kanseller batch
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

        {/* AKTIV FERMENTERING */}
        {hasActive && activeBatch?.status === "Aktiv" && (
          <>
            <h2 className="text-2xl font-semibold mb-4 text-center">
              Aktiv fermentering
            </h2>

            <div className="p-4 bg-white/10 border border-white/20 rounded-xl mb-10">
              <h3 className="text-xl font-bold text-green-300 mb-2">
                {activeBatch.name}
              </h3>

              <p className="opacity-80">Batchnummer: {activeBatch.batchnummer}</p>
              <p className="opacity-80">Startdato: {activeBatch.startdato}</p>
              <p className="opacity-80">OG: {activeBatch.og}</p>
              <p className="opacity-80">Volum: {activeBatch.volume_l} L</p>
              <p className="opacity-80">Status: {activeBatch.status}</p>

              {/* Oppskrift */}
              <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg">
                <h3 className="text-xl font-bold mb-3 text-green-300">Oppskrift</h3>

                <div className="space-y-4 text-sm whitespace-pre-wrap">
                  <div>
                    <h4 className="font-semibold text-white/90 mb-1">Ingredienser</h4>
                    <p className="opacity-80">
                      {activeBatch.oppskrift.split("Ingredienser:")[1]?.split("Fremgangsmåte:")[0]?.trim()}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white/90 mb-1">Fremgangsmåte</h4>
                    <p className="opacity-80">
                      {activeBatch.oppskrift.split("Fremgangsmåte:")[1]?.split("Notater:")[0]?.trim()}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white/90 mb-1">Notater</h4>
                    <p className="opacity-80">
                      {activeBatch.oppskrift.split("Notater:")[1]?.trim()}
                    </p>
                  </div>
                </div>
              </div>

              <p className="opacity-80 mt-4">
                Opprettet: {new Date(activeBatch.created_at).toLocaleString("no-NO")}
              </p>

              {activeBatch.secondary_startdate && (
                <p className="opacity-80 mt-2">
                  Sekundær siden:{" "}
                  {new Date(activeBatch.secondary_startdate).toLocaleDateString("no-NO")}
                </p>
              )}

              {activeBatch.secondary_notes && (
                <p className="opacity-80 mt-2 whitespace-pre-wrap">
                  Sekundærnotater:<br />{activeBatch.secondary_notes}
                </p>
              )}

              {activeBatch.secondary_additions && (
                <p className="opacity-80 mt-2 whitespace-pre-wrap">
                  Sekundærtilsetninger:<br />{activeBatch.secondary_additions}
                </p>
              )}

              {activeBatch.fg && (
                <p className="opacity-80 mt-2">FG: {activeBatch.fg}</p>
              )}

              {activeBatch.abv && (
                <p className="opacity-80 mt-2">
                  ABV: {activeBatch.abv.toFixed(2)}%
                </p>
              )}

              {activeBatch.finished_date && (
                <p className="opacity-80 mt-2">
                  Avsluttet:{" "}
                  {new Date(activeBatch.finished_date).toLocaleDateString("no-NO")}
                </p>
              )}

              {activeBatch.finished_notes && (
                <p className="opacity-80 mt-2 whitespace-pre-wrap">
                  Avslutningsnotater:<br />{activeBatch.finished_notes}
                </p>
              )}
            </div>
            {/* ⭐ Slide-down uten <details> for AKTIV batch */}
            {isOwner && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <button
                  type="button"
                  onClick={() => setOpenSecondaryActive(!openSecondaryActive)}
                  className="w-full flex items-center justify-between font-semibold text-green-300 cursor-pointer"
                >
                  Overfør til sekundær
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
                        placeholder="Tilsetninger"
                        className="p-3 rounded bg-black/40 border border-white/20"
                      />

                      <textarea
                        name="secondary_notes"
                        placeholder="Notater"
                        className="p-3 rounded bg-black/40 border border-white/20"
                      />

                      <button className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold">
                        Overfør til sekundær
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Kanseller */}
            {isOwner && (
              <>
                <form action={Actions.cancelBatch} className="mt-8 mb-4">
                  <input type="hidden" name="batch_id" value={activeBatch.id} />
                  <input type="hidden" name="kar_id" value={kar.id} />
                  <button className="w-full px-2 py-2 bg-red-700/70 hover:bg-red-600/70 border border-red-500/50 rounded-md text-sm">
                    Kanseller batch
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

        {/* HISTORISK BATCH */}
        {!hasActive && hasHistory && (
          <>
            <h2 className="text-2xl font-semibold mb-4 text-center">
              Siste batch
            </h2>

            <div className="p-4 bg-white/10 border border-white/20 rounded-xl mb-10">
              <h3 className="text-xl font-bold text-green-300 mb-2">
                {historyBatch.name}
              </h3>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
