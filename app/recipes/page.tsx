"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../lib/supabase/supabaseBrowser";
import Link from "next/link";

type Recipe = {
  id: string;
  name: string;
  og: number;
  fg: number;
  abv: number;
  volume: number;
  ingredients: string;
  method: string;
  notes: string;
  is_public: boolean;
  created_at: string;
};

export default function RecipesPage() {
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [username, setUsername] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!session) {
        window.location.href = "/auth/login";
        return;
      }

      const token = session.access_token;

      // Hent profil
      const profileRes = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const profileJson = await profileRes.json();
      setUsername(profileJson.username ?? "Ukjent");

      // Hent oppskrifter
      const { data: recipesData } = await supabaseBrowser
        .from("recipes")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      setRecipes(recipesData || []);
      setLoading(false);
    }

    load();
  }, []);

  async function togglePublic(id: string, current: boolean) {
    await supabaseBrowser
      .from("recipes")
      .update({ is_public: !current })
      .eq("id", id);

    setRecipes((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, is_public: !current } : r
      )
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <div className="bg-black/60 backdrop-blur-md p-6 rounded-xl border border-white/10">
          Laster oppskrifter…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative">

        {/* Tilbake */}
        <div className="absolute top-4 left-4">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            ← Tilbake
          </Link>
        </div>

        {/* Konto */}
        <div className="absolute top-4 right-4">
          <Link
            href="/account"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            ⚙️ Konto
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-6 text-center">
          Mine oppskrifter
        </h1>

        <p className="opacity-80 text-center mb-10">
          Oppskrifter lagret fra avsluttede batches.
        </p>

        {recipes.length === 0 && (
          <p className="text-center opacity-60">Ingen oppskrifter enda.</p>
        )}

        <div className="space-y-6">
          {recipes.map((r) => (
            <div
              key={r.id}
              className="p-4 bg-white/10 border border-white/20 rounded-xl"
            >
              <h3 className="text-xl font-bold text-green-300 mb-2">
                {r.name}
              </h3>

              <p className="text-sm opacity-80">
                OG: {r.og} — FG: {r.fg} — ABV: {r.abv.toFixed(1)}%
              </p>

              <p className="text-sm opacity-80 mt-1">
                Volum: {r.volume} L
              </p>

              {r.notes && (
                <p className="mt-3 whitespace-pre-line opacity-90">
                  {r.notes}
                </p>
              )}

              <div className="mt-4 flex items-center gap-3">
                <label className="text-sm opacity-80">
                  Synlig for andre:
                </label>

                <button
                  onClick={() => togglePublic(r.id, r.is_public)}
                  className={`px-4 py-2 rounded-lg font-semibold border ${
                    r.is_public
                      ? "bg-green-600 hover:bg-green-700 border-green-400"
                      : "bg-zinc-700 hover:bg-zinc-600 border-zinc-500"
                  }`}
                >
                  {r.is_public ? "Offentlig" : "Privat"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Fiklebrygg - Batchlogg
        </p>
      </div>
    </main>
  );
}
