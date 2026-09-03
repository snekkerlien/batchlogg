"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import MenuOverlay from "./MenuOverlay";
import BackButton from "./BackButton";

export default function BatchHistoryPage() {

  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [kars, setKars] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

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
          notes: batchNotes,
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
        Loading batches…
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-4xl border border-white/10 relative pt-16 sm:pt-0">

        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay />
        </div>

        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <BackButton />
        </div>

        <h1 className="text-4xl font-bold mb-6 text-center mt-6">
          Batch history
        </h1>

        {batches.length === 0 ? (
          <p className="text-center opacity-70">No batches found.</p>
        ) : (
          <div className="space-y-4">
            {batches.map((batch) => (
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
                      className="px-4 py-2 bg-red-700 hover:bg-red-600 border border-red-500 rounded-lg font-semibold"
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
                      <strong>Status:</strong> {batch.status}
                    </p>

                    <p className="text-sm">
                      <strong>Volume:</strong> {batch.volume_l} L
                    </p>

                    <p className="text-sm">
                      <strong>OG:</strong> {Number(batch.og).toFixed(3)}
                    </p>

                    {batch.fg && (
                      <p className="text-sm">
                        <strong>FG:</strong> {Number(batch.fg).toFixed(3)}
                      </p>
                    )}

                    {batch.abv && (
                      <p className="text-sm">
                        <strong>ABV:</strong> {batch.abv.toFixed(2)}%
                      </p>
                    )}

                    <p className="text-sm">
                      <strong>Start date:</strong>{" "}
                      {new Date(batch.startdato).toLocaleDateString("en-GB")}
                    </p>

                    {batch.finished_date && (
                      <p className="text-sm">
                        <strong>Finished:</strong>{" "}
                        {new Date(batch.finished_date).toLocaleDateString("en-GB")}
                      </p>
                    )}

                    <p className="text-sm">
                      <strong>Vessel:</strong>{" "}
                      {batch.vesselNumber
                        ? `Vessel ${batch.vesselNumber}`
                        : batch.previousVesselNumber
                        ? `No longer linked (previously Vessel ${batch.previousVesselNumber})`
                        : "No longer linked"}
                    </p>

                    {batch.finished_notes && (
                      <p className="text-sm whitespace-pre-line">
                        <strong>Finished notes:</strong>{"\n"}
                        {batch.finished_notes}
                      </p>
                    )}

                    {batch.status === "Sekundær" && (
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

                        {batch.secondary_notes && (
                          <p className="text-sm whitespace-pre-line">
                            <strong>Secondary notes:</strong>{"\n"}
                            {batch.secondary_notes}
                          </p>
                        )}
                      </>
                    )}

                    {batch.oppskrift && (
                      <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                        <h3 className="text-xl font-bold mb-3 text-green-300">Recipe</h3>

                        <div className="space-y-4 text-sm whitespace-pre-wrap">
                          <div>
                            <h4 className="font-semibold text-white/90 mb-1">Ingredients</h4>
                            <p className="opacity-80">
                              {batch.oppskrift
                                .split("Ingredients:")[1]
                                ?.split("Full process:")[0]
                                ?.trim()}
                            </p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-white/90 mb-1">Full Process</h4>
                            <p className="opacity-80">
                              {batch.oppskrift
                                .split("Full process:")[1]
                                ?.split("Notes:")[0]
                                ?.trim()}
                            </p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-white/90 mb-1">Recipe notes</h4>
                            <p className="opacity-80">
                              {batch.oppskrift.split("Notes:")[1]?.trim()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-6">
                      <h3 className="text-xl font-bold mb-3 text-green-300">Batch notes</h3>

                      {batch.notes && batch.notes.length > 0 ? (
                        batch.notes.map((n: any) => (
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
            ))}
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
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 border border-red-500 rounded-lg font-semibold"
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
