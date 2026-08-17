"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function DeleteModal({ batchnummer }: { batchnummer: string }) {
  const [open, setOpen] = useState(false);
  const [kode, setKode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const formattedBatch = String(batchnummer).padStart(4, "0");

    const { error, count } = await supabase
      .from("Batches")
      .delete({ count: "exact" })
      .eq("batchnummer", formattedBatch)
      .eq("kode", kode);

    setLoading(false);

    // Teknisk feil
    if (error) {
      setErrorMsg("En teknisk feil oppstod. Prøv igjen.");
      return;
    }

    // Ingen rader slettet → feil kode
    if (count === 0) {
      setErrorMsg("Feil kode. Sjekk koden og prøv igjen.");
      return;
    }

    // Sletting OK
    setOpen(false);
    window.location.reload();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
      >
        Slett batch
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-xl w-80">
            <h3 className="text-xl font-semibold mb-4 text-center">
              Bekreft sletting
            </h3>

            <form onSubmit={handleDelete} className="space-y-4">
              <div>
                <label className="block mb-1">Sikkerhetskode</label>
                <input
                  type="text"
                  value={kode}
                  onChange={(e) => setKode(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Skriv koden"
                  className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 disabled:opacity-50"
                />

                {errorMsg && (
                  <p className="text-red-400 text-sm mt-2">{errorMsg}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 p-2 rounded font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-4 h-4"></span>
                    Sletter…
                  </>
                ) : (
                  "Slett batch"
                )}
              </button>

              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                disabled={loading}
                className="w-full bg-zinc-700 hover:bg-zinc-600 p-2 rounded font-semibold mt-2 disabled:opacity-50"
              >
                Avbryt
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
