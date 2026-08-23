"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";
import MenuOverlay from "./MenuOverlay";
import { useRouter } from "next/navigation";

export default function ProfileDetailPage({ params }: { params: { username: string } }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [kar, setKar] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!session) return;

      const { data: profileData } = await supabaseBrowser
        .from("profiles")
        .select("*")
        .eq("username", params.username)
        .single();

      if (!profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const userId = profileData.id;

      const { data: karRaw } = await supabaseBrowser
        .from("kar")
        .select("*")
        .eq("user_id", userId)
        .order("nummer");

      const { data: batchesRaw } = await supabaseBrowser
        .from("batches")
        .select("*")
        .eq("user_id", userId);

      const karProcessed = (karRaw ?? []).map((k: any, index: number) => {
        const active = batchesRaw?.find(
          (b: any) => b.aktivt_kar === k.id && b.status === "Aktiv"
        );

        const secondary = batchesRaw?.find(
          (b: any) => b.aktivt_kar === k.id && b.status === "Sekundær"
        );

        let status = "Empty";
        if (active) status = "Primary";
        else if (secondary) status = "Secondary";

        return {
          id: k.id,
          nummer: index + 1,
          created_at: k.created_at,
          status,
        };
      });

      setKar(karProcessed);

      const { data: recipesRaw } = await supabaseBrowser
        .from("recipes")
        .select("*")
        .eq("user_id", userId)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      setRecipes(recipesRaw ?? []);
      setLoading(false);
    }

    load();
  }, [params.username]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        Loading…
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Profile not found</h1>
      </main>
    );
  }

  function toggle(id: string) {
    setExpanded(expanded === id ? null : id);
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10">

        {/* TOP BAR */}
        <div className="flex items-center justify-between mb-6">

          {/* BACK BUTTON */}
          <button
            onClick={() => router.back()}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19l-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </button>

          <MenuOverlay />
        </div>

        <h1 className="text-4xl font-bold mb-6 text-center">
          {profile.username.charAt(0).toUpperCase() + profile.username.slice(1)}
        </h1>

        <p className="opacity-80 text-center mb-10">
          Overview of this user's vessels, active batches, and public recipes.
        </p>

        {/* VESSELS */}
        <h2 className="text-2xl font-semibold mb-4 text-center">Vessels</h2>

        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {kar.length > 0 ? (
            kar.map((k) => (
              <Link
                key={k.id}
                href={`/profiles/${params.username}/${k.id}`}
                className="border border-white/10 rounded-xl p-4 bg-white/5 w-32 h-32 flex flex-col items-center justify-center hover:bg-white/10 transition"
              >
                <span className="text-lg font-bold text-green-300">
                  Vessel {k.nummer}
                </span>

                <span
                  className={
                    k.status === "Primary"
                      ? "text-green-400 font-semibold mt-2"
                      : k.status === "Secondary"
                      ? "text-yellow-400 font-semibold mt-2"
                      : "text-zinc-400 mt-2"
                  }
                >
                  {k.status}
                </span>
              </Link>
            ))
          ) : (
            <p className="opacity-60 text-center">No vessels found.</p>
          )}
        </div>

        {/* RECIPES */}
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Public recipes
        </h2>

        <div className="space-y-4">
          {recipes.length > 0 ? (
            recipes.map((r) => (
              <div
                key={r.id}
                className="bg-white/10 border border-white/20 rounded-xl p-4"
              >
                <button
                  onClick={() => toggle(r.id)}
                  className="w-full flex justify-between items-center text-left"
                >
                  <span className="text-xl font-bold text-green-300">
                    {r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                  </span>

                  <span
                    className={`text-white text-2xl transition-transform duration-200 ${
                      expanded === r.id ? "rotate-90" : "rotate-180"
                    }`}
                  >
                    ▶
                  </span>
                </button>

                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    expanded === r.id ? "max-h-[2000px] mt-4" : "max-h-0"
                  }`}
                >
                  <div className="space-y-3 opacity-90">

                    <p className="text-sm">
                      <strong>OG:</strong> {r.og}
                      <strong className="ml-4">FG:</strong> {r.fg}
                      <strong className="ml-4">ABV:</strong> {r.abv.toFixed(1)}%
                    </p>

                    <p className="text-sm">
                      <strong>Volume:</strong> {r.volume} L
                    </p>

                    {r.ingredients && (
                      <p className="whitespace-pre-line">
                        <strong>Ingredients:</strong>{"\n"}
                        {r.ingredients}
                      </p>
                    )}

                    {r.method && (
                      <p className="whitespace-pre-line">
                        <strong>Method:</strong>{"\n"}
                        {r.method}
                      </p>
                    )}

                    {r.notes && (
                      <p className="whitespace-pre-line">
                        <strong>Notes:</strong>{"\n"}
                        {r.notes}
                      </p>
                    )}

                    <div className="flex justify-end pt-4">
                      <Link
                        href={`/profiles/${params.username}/recipes/${r.id}`}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold"
                      >
                        Open note log →
                      </Link>
                    </div>

                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="opacity-60 text-center">No public recipes.</p>
          )}
        </div>

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Fiklebrygg - Batchlogg
        </p>
      </div>
    </main>
  );
}
