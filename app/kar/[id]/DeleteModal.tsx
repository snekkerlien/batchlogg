"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function DeleteModal({ batchnummer }: { batchnummer: string }) {
  const [open, setOpen] = useState(false);
  const [kode, setKode] = useState("");

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const formattedBatch = String(batchnummer).padStart(4, "0");

    const { error } = await supabase
      .from("Batches")
      .delete()
      .eq("batchnummer", formattedBatch)
      .eq("kode", kode);

    if (error) {
      alert("Kunne ikke slette batch: " + error.message);
      return;
    }

    // Lukk modal
    setOpen(false);

    // Oppdater siden
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
                  placeholder="Skriv koden"
                  className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 p-2 rounded font-semibold"
              >
                Slett batch
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full bg-zinc-700 hover:bg-zinc-600 p-2 rounded font-semibold mt-2"
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
