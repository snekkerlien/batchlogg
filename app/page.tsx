"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [username, setUsername] = useState("");

  // Sjekk session + lytt på endringer
  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      setSession(session);

      if (session) {
        const token = session.access_token;
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json = await res.json();
          setUsername(json.username ?? "Ukjent");
        }
      }

      setLoading(false);
    }

    load();

    // ⭐ FIX: Oppdater session automatisk ved login/logout
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // ⭐ FIX: Vent litt etter signOut før refresh
  async function logout() {
    await supabaseBrowser.auth.signOut();

    // Gi Supabase tid til å skrive nye cookies
    await new Promise((r) => setTimeout(r, 80));

    router.refresh();
    router.replace("/");
  }

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-white relative">

      {/* CO2 BOBLER */}
      <div className="bubble-container absolute inset-0 pointer-events-none">
        {[...Array(25)].map((_, i) => (
          <span
            key={i}
            className="bubble"
            style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${3 + Math.random() * 4}s`,
              animationDelay: `${Math.random() * 3}s`,
              width: `${4 + Math.random() * 8}px`,
              height: `${4 + Math.random() * 8}px`,
            }}
          />
        ))}
      </div>

      {/* HERO */}
      <div className="text-center space-y-6 bg-black/40 backdrop-blur-md p-10 rounded-xl border border-white/10 max-w-2xl relative z-10">
        <h1 className="text-5xl font-bold">Batchlogg</h1>
        <p className="text-lg opacity-80">
          Brygg smartere. Logg bedre. Hold styr på kar, batches og oppskrifter.
        </p>

        {/* AUTH KNAPPER */}
        {!session && (
          <div className="flex flex-col gap-4 mt-6">
            <a
              href="/auth/login"
              className="block bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold"
            >
              Logg inn
            </a>

            <a
              href="/auth/signup"
              className="block bg-green-600 hover:bg-green-700 p-3 rounded-lg font-semibold"
            >
              Registrer
            </a>
          </div>
        )}

        {session && (
          <div className="flex flex-col gap-4 mt-6">
            <p className="text-center text-green-300 font-semibold">
              Logget inn som {username}
            </p>

            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 p-3 rounded-lg font-semibold"
            >
              Logg ut
            </button>

            <a
              href="/dashboard"
              className="block bg-white/10 hover:bg-white/20 p-3 rounded-lg font-semibold"
            >
              Gå til dashboard
            </a>
          </div>
        )}
      </div>

      {/* INFOSEKSJONER */}
      <div className="mt-20 max-w-3xl space-y-16 relative z-10">

        {/* Hva er Batchlogg */}
        <section className="bg-black/30 backdrop-blur-md p-8 rounded-xl border border-white/10">
          <h2 className="text-3xl font-bold mb-4 text-center">Hva er Batchlogg?</h2>
          <ul className="space-y-3 text-lg opacity-90">
            <li>• Full oversikt over alle karene dine</li>
            <li>• Logg OG, FG, notater og bilder for hver batch</li>
            <li>• Lagre og del oppskrifter</li>
            <li>• Se andre bryggere og deres offentlige oppskrifter</li>
          </ul>
        </section>

        {/* Hvorfor bruke Batchlogg */}
        <section className="bg-black/30 backdrop-blur-md p-8 rounded-xl border border-white/10">
          <h2 className="text-3xl font-bold mb-4 text-center">Hvorfor bruke Batchlogg?</h2>
          <ul className="space-y-3 text-lg opacity-90">
            <li>• Full kontroll over bryggeprosessen</li>
            <li>• Alt samlet på ett sted</li>
            <li>• Ingen mer rot i notater og bilder</li>
            <li>• Perfekt for både hobby og seriøs brygging</li>
          </ul>
        </section>

        {/* For bryggere, av bryggere */}
        <section className="bg-black/30 backdrop-blur-md p-8 rounded-xl border border-white/10 text-center">
          <h2 className="text-3xl font-bold mb-4">For bryggere, av bryggere</h2>
          <p className="text-lg opacity-90">
            Batchlogg er laget for bryggere som vil ha struktur, oversikt og enkelhet.
            Enten du brygger i garasjen eller driver et lite bryggeri – dette er ditt verktøy.
          </p>
        </section>

      </div>

      {/* FOOTER */}
      <p className="text-sm opacity-40 mt-20 relative z-10">
        © {new Date().getFullYear()} Fiklebrygg - Batchlogg
      </p>
    </div>
  );
}
