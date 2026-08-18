"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Typer
type Kar = {
  id: number;
  user_id: string;
  navn: string;
};

type Batch = {
  id: number;
  user_id: string;
  aktivt_kar: number;
  batchnummer: number;
  status: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [kar, setKar] = useState<Kar[]>([]);
  const [aktiveKar, setAktiveKar] = useState<Set<number>>(new Set());

  // ---------------------------
  // HENT DATA
  // ---------------------------
  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        router.push("/login");
        return;
      }

      const safeUser = sessionData.session.user;
      setUser(safeUser);

      // Hent kar
      let { data: karData } = await supabase
        .from("kar")
        .select("*")
        .eq("user_id", safeUser.id)
        .order("id");

      // Hvis ingen kar → lag Kar 1
      if (!karData || karData.length === 0) {
        await supabase.from("kar").insert({
          user_id: safeUser.id,
          navn: "Kar 1"
        });

        const refreshed = await supabase
          .from("kar")
          .select("*")
          .eq("user_id", safeUser.id)
          .order("id");

        karData = refreshed.data ?? [];
      }

      setKar(karData as Kar[]);

      // Hent aktive batches
      const { data: batches } = await supabase
        .from("Batches")
        .select("*")
        .eq("user_id", safeUser.id)
        .eq("status", "Aktiv");

      const aktivSet = new Set(
        (batches as Batch[] | null)?.map((b) => b.aktivt_kar) ?? []
      );

      setAktiveKar(aktivSet);

      setLoading(false);
    }

    init();
  }, []);

  // ---------------------------
  // LEGG TIL NYTT KAR (CLIENT)
  // ---------------------------
  async function addKarClient() {
    if (!user) return;

    const { count } = await supabase
      .from("kar")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const safeCount = count ?? 0;

    if (safeCount >= 9) return;

    await supabase.from("kar").insert({
      user_id: user.id,
      navn: `Kar ${safeCount + 1}`
    });

    window.location.reload();
  }

  // ---------------------------
  // FJERN KAR (CLIENT)
  // ---------------------------
  async function removeKarClient(karId: number) {
    if (!user) return;

    // Sjekk om karet har aktiv batch
    const { data: active } = await supabase
      .from("Batches")
      .select("*")
      .eq("aktivt_kar", karId)
      .eq("user_id", user.id)
      .eq("status", "Aktiv")
      .maybeSingle();

    if (active) {
      alert("Du kan ikke fjerne et kar som er i bruk.");
      return;
    }

    await supabase
      .from("kar")
      .delete()
      .eq("id", karId)
      .eq("user_id", user.id);

    window.location.reload();
  }

  // ---------------------------
  // LOADING
  // ---------------------------
  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Laster...</p>
      </main>
    );
  }

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-bold mb-6">Batchlogg</h1>

        <p className="opacity-80 mb-8">
          Oversikt over alle kar og deres status.
        </p>

        <div className="grid grid-cols-3 gap-4">
          {kar.map((k) => {
            const aktiv = aktiveKar.has(k.id);

            return (
              <div
                key={k.id}
                className="group border border-white/10 rounded-xl p-6 bg-white/5 hover:bg-white/10 transition flex flex-col items-center relative overflow-hidden"
              >
                <a
                  href={`/kar/${k.id}`}
                  className="flex flex-col items-center mb-2 relative"
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-300"
                  >
                    <path
                      d="M4 4h16v2H4z"
                      className="lokket transition-transform duration-300"
                      style={{ transformOrigin: "12px 4px" }}
                    />
                    <path d="M6 6v11a5 5 0 0 0 5 5h2a5 5 0 0 0 5-5V6" />
                    <path d="M9 10h6" />
                    <path d="M12 2v2" />
                    <circle cx="12" cy="2" r="1" />
                  </svg>

                  <span className="absolute top-[14px] text-lg font-bold text-green-300">
                    {k.navn.replace("Kar ", "")}
                  </span>
                </a>

                {aktiv ? (
                  <span className="text-green-400 font-semibold">
                    Aktiv batch
                  </span>
                ) : (
                  <>
                    <span className="text-zinc-400">Ledig</span>

                    <button
                      onClick={() => removeKarClient(k.id)}
                      className="mt-2 text-red-400 hover:text-red-300 text-sm"
                    >
                      Fjern kar
                    </button>
                  </>
                )}
              </div>
            );
          })}

          {/* + knapp */}
          {kar.length < 9 && (
            <button
              onClick={addKarClient}
              className="border border-white/10 rounded-xl p-6 bg-white/5 hover:bg-white/10 transition flex flex-col items-center justify-center text-4xl font-bold text-green-300"
            >
              +
            </button>
          )}
        </div>

        <p className="text-sm opacity-40 mt-12">
          © {new Date().getFullYear()} Fiklebrygg. Alle rettigheter reservert.
        </p>
      </div>
    </main>
  );
}
