"use client";

import { useState } from "react";
import { DeleteBatchAction } from "./DeleteBatchAction";

export default function DeleteModal({ batchnummer }: { batchnummer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Knapp som åpner modal */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
      >
        Slett batch
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-xl w-80">
            <h3 className="text-xl font-semibold mb-4 text-center">
              Bekreft sletting
            </h3>

            <form action={DeleteBatchAction} className="space-y-4">
              {/* Batchnummer sendes som hidden input */}
              <input type="hidden" name="batchnummer" value={batchnummer} />

              <div>
                <label className="block mb-1">Sikkerhetskode</label>
                <input
                  type="text"
                  name="kode"
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
