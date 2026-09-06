"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";
import BackButton from "./BackButton";
import MenuOverlay from "./MenuOverlay";

export default function NewRecipePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // ⭐ NEW: OG/FG/ABV state
  const [og, setOg] = useState("");
  const [fg, setFg] = useState("");
  const [abv, setAbv] = useState("");

  // ⭐ NEW: Auto-calc ABV
  useEffect(() => {
    const ogNum = parseFloat(og);
    const fgNum = parseFloat(fg);

    if (!isNaN(ogNum) && !isNaN(fgNum)) {
      const result = (ogNum - fgNum) * 131.25;
      setAbv(result.toFixed(1));
    } else {
      setAbv("");
    }
  }, [og, fg]);

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.target);

    const {
      data: { session },
    } = await supabaseBrowser.auth.getSession();

    if (!session) return;

    await supabaseBrowser.from("recipes").insert({
      user_id: session.user.id,
      name: form.get("name"),
      og: og || null,
      fg: fg || null,
      abv: abv || null,
      volume: form.get("volume"),
      ingredients: form.get("ingredients"),
      method: form.get("method"),
      notes: form.get("notes"),
      is_public: false,
      batch_id: null, // ⭐ MANUAL RECIPE
    });

    router.push("/recipes");
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10">

        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay />
        </div>

        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <BackButton />
        </div>

        <h1 className="text-3xl font-bold mb-6 text-center">New recipe</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <input
            name="name"
            placeholder="Recipe name"
            className="p-3 rounded bg-black/40 border border-white/20"
            required
          />

          {/* ⭐ OG */}
          <input
            name="og"
            type="number"
            step="0.001"
            placeholder="OG"
            value={og}
            onChange={(e) => setOg(e.target.value)}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          {/* ⭐ FG */}
          <input
            name="fg"
            type="number"
            step="0.001"
            placeholder="FG"
            value={fg}
            onChange={(e) => setFg(e.target.value)}
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          {/* ⭐ Auto-filled ABV */}
          <input
            name="abv"
            type="number"
            step="0.1"
            placeholder="ABV"
            value={abv}
            readOnly
            className="p-3 rounded bg-black/40 border border-white/20 opacity-70"
          />

          <input
            name="volume"
            type="number"
            step="0.1"
            placeholder="Volume (L)"
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <textarea
            name="ingredients"
            placeholder="Ingredients"
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <textarea
            name="method"
            placeholder="Full process"
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <textarea
            name="notes"
            placeholder="Notes"
            className="p-3 rounded bg-black/40 border border-white/20"
          />

          <button
            disabled={loading}
            className="px-4 py-3 bg-green-700 hover:bg-green-600 border border-green-500 rounded-lg font-semibold"
          >
            {loading ? "Saving..." : "Save recipe"}
          </button>
        </form>
      </div>
    </main>
  );
}
