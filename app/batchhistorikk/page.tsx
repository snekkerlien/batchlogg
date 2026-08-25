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

      // Fetch batches
      const { data: batchesRaw } = await supabaseBrowser
        .from("batches")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // Fetch vessels
      const { data: karsRaw } = await supabaseBrowser
        .from("kar")
        .select("*")
        .eq("user_id", userId);

      const sortedKars = [...(karsRaw ?? [])].sort(
        (a, b) => a.nummer - b.nummer
      );

      // Fetch batch notes for all batches
      const { data: notesRaw } = await supabaseBrowser
        .from("batch_notes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // Enrich batches with vessel number + notes
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

        {/* TOP BAR */}
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
                {/* CLICKABLE HEADER */}
                <button
                  onClick={() => toggle(batch.id)}
                  className="w-full flex justify-between items-center text-left"
                >
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-green-300">
                      {batch.name}
                    </span>

                    {/* DATE ALWAYS VISIBLE */}
                    <span className="text-sm opacity-70">
                      {new Date(batch.startdato).toLocaleDateString("en-GB")}
                    </span>
                  </div>

                  <span
                    className={`text-white text-2xl transition-transform duration-200 ${
                      expanded === batch.id ? "rotate-90" : "rotate-180"
                    }`}
                  >
                    ▶
                  </span>
                </button>

                {/* COLLAPSIBLE CONTENT */}
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    expanded === batch.id ? "max-h-[5000px] mt-4" : "max-h-0"
                  }`}
                >
                  <div className="space-y-4 opacity-90">

                    {/* BASIC INFO */}
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

                    {/* FINISHED NOTES */}
                    {batch.finished_notes && (
                      <p className="text-sm whitespace-pre-line">
                        <strong>Finished notes:</strong>{"\n"}
                        {batch.finished_notes}
                      </p>
                    )}

                    {/* SECONDARY INFO */}
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

                    {/* RECIPE PARSED */}
                    {batch.oppskrift && (
                      <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                        <h3 className="text-xl font-bold mb-3 text-green-300">Recipe</h3>

                        <div className="space-y-4 text-sm whitespace-pre-wrap">

                          <div>
                            <h4 className="font-semibold text-white/90 mb-1">Ingredients</h4>
                            <p className="opacity-80">
                              {batch.oppskrift.split("Ingredienser:")[1]?.split("Fremgangsmåte:")[0]?.trim()}
                            </p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-white/90 mb-1">Method</h4>
                            <p className="opacity-80">
                              {batch.oppskrift.split("Fremgangsmåte:")[1]?.split("Notater:")[0]?.trim()}
                            </p>
                          </div>

                          <div>
                            <h4 className="font-semibold text-white/90 mb-1">Notes</h4>
                            <p className="opacity-80">
                              {batch.oppskrift.split("Notater:")[1]?.trim()}
                            </p>
                          </div>

                        </div>
                      </div>
                    )}

                    {/* BATCH NOTES */}
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

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Batchlog
        </p>
      </div>
    </main>
  );
}
