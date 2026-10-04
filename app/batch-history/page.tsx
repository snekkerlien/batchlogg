"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";
import BatchSGChart from "../components/BatchSGChart";
import PageHeading from "../components/PageHeading";
import { Qty } from "@/app/components/Units";

function hasTypeSpecificRecipe(batch: any) {
  return Boolean(
    batch.honey_type ||
      batch.fruits?.length ||
      batch.malts?.length ||
      batch.hops?.length ||
      batch.boil_time ||
      batch.juice_type ||
      batch.sugar_amount ||
      batch.ingredients?.length ||
      batch.steps?.length
  );
}

function getCurrentAbv(og: unknown, readings: Array<{ sg: unknown }>) {
  if (og === null || og === undefined || og === "" || readings.length === 0) {
    return null;
  }

  const originalGravity = Number(og);
  const currentGravity = Number(readings[readings.length - 1].sg);
  if (!Number.isFinite(originalGravity) || !Number.isFinite(currentGravity)) {
    return null;
  }

  return ((originalGravity - currentGravity) * 131.25).toFixed(2);
}

export default function BatchHistoryPage() {

  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [kars, setKars] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sgReadingsError, setSgReadingsError] = useState("");

  // ⭐ NEW: delete confirmation modal state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!session) {
        window.location.href = "/auth/login";
        return;
      }

      const userId = session.user.id;

      const { data: batchesRaw } = await supabaseBrowser
        .from("batches")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const { data: karsRaw } = await supabaseBrowser
        .from("kar")
        .select("*")
        .eq("user_id", userId);

      const sortedKars = [...(karsRaw ?? [])].sort(
        (a, b) => a.nummer - b.nummer
      );

      const { data: notesRaw } = await supabaseBrowser
        .from("batch_notes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const batchIds = (batchesRaw ?? []).map((batch) => batch.id);
      let readingsByBatch = new Map<string, any[]>();

      if (batchIds.length > 0) {
        const { data: readings, error: readingsError } = await supabaseBrowser
          .from("sg_readings")
          .select("id, batch_id, sg, created_at")
          .in("batch_id", batchIds)
          .order("created_at", { ascending: true });

        if (readingsError) {
          console.error("Could not load SG readings for batch timelines", readingsError);
          setSgReadingsError("SG readings could not be loaded.");
        } else {
          readingsByBatch = new Map();
          for (const reading of readings ?? []) {
            if (!reading.batch_id) continue;
            const batchReadings = readingsByBatch.get(reading.batch_id) ?? [];
            batchReadings.push(reading);
            readingsByBatch.set(reading.batch_id, batchReadings);
          }
        }
      }

      const enriched = (batchesRaw ?? []).map((batch) => {
        const index = sortedKars.findIndex((k) => k.id === batch.aktivt_kar);
        const previousKar = sortedKars.find((k) => k.id === batch.aktivt_kar);
        const previousKarNumber = previousKar
          ? sortedKars.findIndex((k) => k.id === previousKar.id) + 1
          : null;

        const batchNotes = (notesRaw ?? []).filter(
          (n) => n.batch_id === batch.id
        );

        return {
          ...batch,
          vesselNumber: index !== -1 ? index + 1 : null,
          previousVesselNumber: previousKarNumber,
          notesLog: batchNotes,
          sgReadings: readingsByBatch.get(batch.id) ?? [],
        };
      });

      setBatches(enriched);
      setKars(sortedKars);
      setLoading(false);
    }

    load();
  }, []);

  function toggle(id: string) {
    setExpanded(expanded === id ? null : id);
  }

  async function deleteBatch(id: string) {
    const res = await fetch("/api/batches/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setBatches((prev) => prev.filter((b) => b.id !== id));
    }
  }

  if (loading) {
  return (
    <main className="min-h-screen flex items-center justify-center text-white">
      <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10">
        Loading batches…
      </div>
    </main>
  );
}

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-4xl border border-white/10 relative pt-16 sm:pt-16">

        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay />
        </div>

        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <BackButton />
        </div>

        <PageHeading
          title="Batch history"
          subtitle="Review your batches, fermentation details, and SG readings."
        />

        {sgReadingsError && (
          <p role="alert" className="mb-6 text-center text-sm text-amber-300">
            {sgReadingsError}
          </p>
        )}

        {batches.length === 0 ? (
          <p className="text-center opacity-70">No batches found.</p>
        ) : (
          <div className="space-y-4">
            {batches.map((batch) => {
              const isFinished =
                Boolean(batch.finished_date) ||
                ["finished", "avsluttet"].includes(
                  String(batch.status ?? "").toLowerCase()
                );
              const currentAbv = isFinished
                ? null
                : getCurrentAbv(batch.og, batch.sgReadings);
              const status = String(batch.status ?? "");

              return (
                <div
                  key={batch.id}
                  className="bg-white/10 border border-white/20 rounded-xl p-4"
                >
                {/* HEADER — ONLY THIS AREA EXPANDS */}
                <div
                  className="w-full flex justify-between items-center mb-2 cursor-pointer"
                  onClick={() => toggle(batch.id)}
                >
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-green-300">
                      {batch.name}
                    </span>

                    <span className="text-sm opacity-70">
                      {new Date(batch.startdato).toLocaleDateString("en-GB")}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">

                    {/* ALWAYS VISIBLE DELETE BUTTON — NOW OPENS CONFIRMATION */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // prevent expand
                        setConfirmDeleteId(batch.id); // open modal
                      }}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
                    >
                      Delete
                    </button>

                    <span
                      className={`text-white text-2xl transition-transform duration-200 ${
                        expanded === batch.id ? "rotate-90" : "rotate-180"
                      }`}
                    >
                      ▶
                    </span>
                  </div>
                </div>
                {/* COLLAPSIBLE CONTENT */}
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    expanded === batch.id ? "max-h-[5000px] mt-4" : "max-h-0"
                  }`}
                >
                  <div className="space-y-4 opacity-90">

                    <p className="text-sm">
                      <strong>Batch number:</strong> {batch.batchnummer}
                    </p>

                    <p className="text-sm">
                      <strong>Status:</strong>{" "}
                      {status.toLowerCase() === "avsluttet"
                        ? "Finished"
                        : ["sekundær", "secondary"].includes(status.toLowerCase())
                          ? "Secondary"
                          : status}
                    </p>

                    <p className="text-sm">
                      <strong>Type:</strong> {batch.type}
                    </p>

                    <p className="text-sm">
                      <strong>Volume:</strong> <Qty kind="volume" value={batch.volume_l} />
                    </p>

                    <p className="text-sm">
                      <strong>OG:</strong> {Number(batch.og).toFixed(3)}
                    </p>

                    {batch.fg && (
                      <p className="text-sm">
                        <strong>FG:</strong> {Number(batch.fg).toFixed(3)}
                      </p>
                    )}

                    {batch.abv !== null && batch.abv !== undefined && (
                      <p className="text-sm">
                        <strong>Final ABV:</strong> {Number(batch.abv).toFixed(2)}%
                      </p>
                    )}

                    <p className="text-sm">
                      <strong>Start date:</strong>{" "}
                      {new Date(batch.startdato).toLocaleDateString("en-GB")}
                    </p>

                    <section className="mt-6" aria-label="SG development chart">
                      <h3 className="text-xl font-bold mb-3 text-green-300">
                        SG development
                      </h3>
                      {batch.sgReadings.length > 0 ? (
                        <div className="bg-black/40 p-4 rounded-lg border border-white/10">
                          <BatchSGChart readings={batch.sgReadings} />
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-400">
                          No SG readings recorded.
                        </p>
                      )}
                      {currentAbv !== null && (
                        <p className="mt-4 text-center text-lg font-semibold text-green-300">
                          Current ABV: {currentAbv}%
                        </p>
                      )}
                    </section>

                    {(batch.type === "Beer" || batch.type === "Braggot") && (
                      <>
                        {batch.ibu !== null && batch.ibu !== undefined && (
                          <p className="text-sm">
                            <strong>IBU:</strong> {Number(batch.ibu).toFixed(0)}
                          </p>
                        )}
                        {batch.ebc !== null && batch.ebc !== undefined && (
                          <p className="text-sm">
                            <strong>EBC:</strong> {Number(batch.ebc).toFixed(0)}
                          </p>
                        )}
                      </>
                    )}

                    {batch.finished_date && (
                      <p className="text-sm">
                        <strong>Finished:</strong>{" "}
                        {new Date(batch.finished_date).toLocaleDateString("en-GB")}
                      </p>
                    )}

                    {batch.finished_notes && (
                      <p className="text-sm whitespace-pre-line">
                        <strong>Finished notes:</strong>{"\n"}
                        {batch.finished_notes}
                      </p>
                    )}

                    {(batch.secondary_startdate || batch.had_secondary) && (
                      <>
                        
                        {batch.secondary_startdate && (
                          <p className="text-sm">
                            <strong>Secondary since:</strong>{" "}
                            {new Date(batch.secondary_startdate).toLocaleDateString("en-GB")}
                          </p>
                        )}

                        {batch.secondary_additions && (
                          <p className="text-sm whitespace-pre-line">
                            <strong>Additions:</strong>{"\n"}
                            {batch.secondary_additions}
                          </p>
                        )}

                        <p className="text-sm whitespace-pre-line">
                          <strong>Secondary notes:</strong>{"\n"}
                          {batch.secondary_notes?.trim() || "No notes"}
                        </p>
                      </>
                    )}

                    <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                      <h3 className="text-xl font-bold mb-3 text-green-300">Recipe</h3>

                      <div className="space-y-4 text-sm whitespace-pre-wrap">
                        {batch.type === "Mead" && (
                          <>
                            <p><strong>Honey:</strong> {batch.honey_type} – <Qty kind="kg" value={batch.honey_amount} /></p>
                            {batch.fruits?.length > 0 && (
                              <div>
                                <strong>Fruits:</strong>
                                {batch.fruits.map((fruit: any, index: number) => (
                                  <p key={index}>{fruit.name}: {fruit.amount}{fruit.unit}</p>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {batch.type === "Beer" && (
                          <>
                            {batch.malts?.length > 0 && (
                              <div>
                                <strong>Malt additions:</strong>
                                {batch.malts.map((malt: any, index: number) => (
                                  <p key={index}>{malt.name}: <Qty kind="kg" value={malt.amount} /></p>
                                ))}
                              </div>
                            )}
                            {batch.hops?.length > 0 && (
                              <div>
                                <strong>Hop schedule:</strong>
                                {batch.hops.map((hop: any, index: number) => (
                                  <p key={index}>{hop.name}: <Qty kind="g" value={hop.amount} maxDecimals={0} /> @ {hop.time} min</p>
                                ))}
                              </div>
                            )}
                            <p><strong>Total boil time:</strong> {batch.boil_time} min</p>
                          </>
                        )}

                        {batch.type === "Braggot" && (
                          <>
                            {batch.malts?.length > 0 && (
                              <div>
                                <strong>Malt additions:</strong>
                                {batch.malts.map((malt: any, index: number) => (
                                  <p key={index}>{malt.name}: <Qty kind="kg" value={malt.amount} /></p>
                                ))}
                              </div>
                            )}
                            <p><strong>Boil time:</strong> {batch.boil_time} min</p>
                            <p><strong>Honey:</strong> <Qty kind="kg" value={batch.honey_amount} /></p>
                          </>
                        )}

                        {(batch.type === "Cider" || batch.type === "Wine" || batch.type === "Seltzer") && (
                          <>
                            <p><strong>Juice type:</strong> {batch.juice_type}</p>
                            <p><strong>Sugar added:</strong> <Qty kind="kg" value={batch.sugar_amount} /></p>
                          </>
                        )}

                        {batch.type === "Other" && (
                          <>
                            {batch.ingredients?.length > 0 && (
                              <div>
                                <strong>Ingredients:</strong>
                                {batch.ingredients.map((ingredient: any, index: number) => (
                                  <p key={index}>{ingredient.name}: {ingredient.amount}{ingredient.unit}</p>
                                ))}
                              </div>
                            )}
                            {batch.steps?.length > 0 && (
                              <div>
                                <strong>Process steps:</strong>
                                {batch.steps.map((step: string, index: number) => (
                                  <p key={index}>{index + 1}. {step}</p>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {batch.additives && (
                          <p><strong>Additives:</strong><br />{batch.additives}</p>
                        )}
                        {batch.full_process && (
                          <p><strong>Full process:</strong><br />{batch.full_process}</p>
                        )}
                        {batch.notes && typeof batch.notes === "string" && (
                          <p><strong>Recipe notes:</strong><br />{batch.notes}</p>
                        )}

                        {batch.oppskrift && !hasTypeSpecificRecipe(batch) && (
                          <div className="space-y-4">
                            <p><strong>Legacy recipe:</strong></p>
                            <p>
                              {batch.oppskrift
                                .split("Ingredients:")[1]
                                ?.split("Full process:")[0]
                                ?.trim() || batch.oppskrift}
                            </p>
                            {batch.oppskrift.includes("Full process:") && (
                              <p>
                                <strong>Full process:</strong><br />
                                {batch.oppskrift
                                  .split("Full process:")[1]
                                  ?.split("Notes:")[0]
                                  ?.trim()}
                              </p>
                            )}
                            {batch.oppskrift.includes("Notes:") && (
                              <p>
                                <strong>Recipe notes:</strong><br />
                                {batch.oppskrift.split("Notes:")[1]?.trim()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-xl font-bold mb-3 text-green-300">Batch notes</h3>

                      {batch.notesLog && batch.notesLog.length > 0 ? (
                        batch.notesLog.map((n: any) => (
                          <div
                            key={n.id}
                            className="p-4 bg-white/10 border border-white/20 rounded-xl mb-4"
                          >
                            <p className="text-sm opacity-60">
                              {new Date(n.created_at).toLocaleDateString("en-GB")}
                            </p>

                            {n.note_type === "image" && n.image_url && (
                              <img
                                src={n.image_url}
                                alt="Batch note image"
                                className="rounded-lg mt-3"
                              />
                            )}

                            {n.note && (
                              <p className="mt-3 whitespace-pre-line">{n.note}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="opacity-60">No notes yet.</p>
                      )}
                    </div>

                  </div>
                </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ⭐ CONFIRM DELETE MODAL */}
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-white/20 p-6 rounded-xl w-full max-w-sm text-white">
              <h2 className="text-xl font-bold mb-4">Delete batch?</h2>

              <p className="opacity-80 mb-6">
                Are you sure you want to delete this batch? This action cannot be undone.
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
                    await deleteBatch(confirmDeleteId);
                    setConfirmDeleteId(null);
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
                >
                  Delete
                </button>
              </div>
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
