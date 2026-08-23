"use client";

import { useRouter } from "next/navigation";
import { createBatch } from "./createBatch";
import { RecipeEditor } from "./RecipeEditor";

type KarType = {
  id: string;        // UUID
  nummer: number;    // auto-increment INT
  created_at: string;
  status: string;
};

type KarClientProps = {
  kar: KarType;
};

export default function KarClient({ kar }: KarClientProps) {
  const router = useRouter();

  return (
    <form
      action={async (formData) => {
        // Send UUID to server action
        formData.set("kar", kar.id);

        await createBatch(formData);

        router.refresh();
      }}
      className="space-y-4 text-white"
    >
      {/* Hidden field for vessel ID (UUID) */}
      <input type="hidden" name="kar" value={kar.id} />

      <div>
        <label className="block mb-1">Batch name</label>
        <input
          type="text"
          name="name"
          required
          placeholder="Enter batch name"
          className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
        />
      </div>

      <div>
        <label className="block mb-1">Volume (liters)</label>
        <input
          type="number"
          name="volume_l"
          required
          placeholder="Enter volume in liters"
          className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
        />
      </div>

      <div>
        <label className="block mb-1">Brew date</label>
        <input
          type="date"
          name="startdato"
          required
          defaultValue={new Date().toISOString().split("T")[0]}
          className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
        />
      </div>

      <div>
        <label className="block mb-1">Original Gravity (OG)</label>
        <input
          type="number"
          step="0.001"
          name="og"
          required
          placeholder="Enter original gravity"
          className="w-full p-2 rounded bg-zinc-800 border border-zinc-700"
        />
      </div>

      <RecipeEditor />

      <button
        type="submit"
        className="w-full bg-green-600 hover:bg-green-700 p-2 rounded font-semibold"
      >
        Register batch
      </button>
    </form>
  );
}
