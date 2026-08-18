"use client";

import { useRouter } from "next/navigation";
import { createBatch } from "./createBatch";
import { RecipeEditor } from "./RecipeEditor";

export default function RegisterBatchForm({ karId }: { karId: string }) {
  const router = useRouter();

  return (
    <form
      action={async (formData) => {
        // Sett riktig kar-id (uuid)
        formData.set("kar", karId);

        // Kall server action
        await createBatch(formData);

        // Oppdater siden slik at KarPage henter batch på nytt
        router.refresh();
      }}
      className="space-y-4"
    >
      {/* Skjult felt for kar-id */}
      <input type="hidden" name="kar" value={karId} />

      <div>
        <label className="block mb-1">Batchnavn</label>
        <input
          type="text"
          name="name"
          required
          placeholder="Skriv navn på batchen"
          className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
        />
      </div>

      <div>
        <label className="block mb-1">Batchstørrelse (liter)</label>
        <input
          type="number"
          name="volume_l"
          required
          placeholder="Skriv antall liter"
          className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
        />
      </div>

      <div>
        <label className="block mb-1">Startdato</label>
        <input
          type="date"
          name="startdato"
          required
          defaultValue={new Date().toISOString().split("T")[0]}
          className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
        />
      </div>

      <div>
        <label className="block mb-1">OG</label>
        <input
          type="number"
          step="0.001"
          name="og"
          required
          placeholder="Skriv original gravity"
          className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
        />
      </div>

      <div>
        <label className="block mb-1">Sikkerhetskode</label>
        <input
          type="text"
          name="kode"
          required
          placeholder="Velg en kode for sletting/endring"
          className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
        />
      </div>

      <RecipeEditor />

      <button
        type="submit"
        className="w-full bg-green-600 hover:bg-green-700 p-2 rounded font-semibold"
      >
        Registrer batch
      </button>
    </form>
  );
}
