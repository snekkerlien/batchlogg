"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [username, setUsername] = useState("");

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
          setUsername(json.username ?? "Unknown");
        }
      }

      setLoading(false);
    }

    load();

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    await supabaseBrowser.auth.signOut();
    await new Promise((r) => setTimeout(r, 80));
    router.refresh();
    router.replace("/");
  }

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-white relative">

      {/* CO2 BUBBLES */}
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
      <div className="text-center space-y-6 bg-black/40 backdrop-blur-md p-10 rounded-xl border border-white/10 max-w-3xl relative z-10">
        <h1 className="text-5xl font-bold">Batchlogg</h1>
        <p className="text-lg opacity-80 max-w-2xl mx-auto">
          The complete brewing workspace for tracking batches, refining recipes, managing inventory, and connecting with the brewers around you.
        </p>

        {/* AUTH BUTTONS */}
        {!session && (
          <div className="flex flex-col gap-4 mt-6">
            <a
              href="/auth/login"
              className="block bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold"
            >
              Log in
            </a>

            <a
              href="/auth/signup"
              className="block bg-green-600 hover:bg-green-700 p-3 rounded-lg font-semibold"
            >
              Sign up
            </a>
          </div>
        )}

        {session && (
          <div className="flex flex-col gap-4 mt-6">
            <p className="text-center text-green-300 font-semibold">
              Logged in as {username}
            </p>

            <button
              onClick={logout}
              className="bg-white/10 hover:bg-white/20 border border-white/20 p-3 rounded-lg font-semibold"
            >
              Log out
            </button>

            <a
              href="/dashboard"
              className="block bg-white/10 hover:bg-white/20 p-3 rounded-lg font-semibold"
            >
              Go to dashboard
            </a>
          </div>
        )}
      </div>

      {/* INFO SECTIONS */}
      <div className="mt-20 max-w-4xl space-y-16 relative z-10">

        {/* What is Batchlogg */}
        <section className="bg-black/30 backdrop-blur-md p-8 rounded-xl border border-white/10">
          <h2 className="text-3xl font-bold mb-4 text-center">What is Batchlogg?</h2>
          <p className="text-lg opacity-90 mb-6 text-center max-w-3xl mx-auto">
            Batchlogg is the all-in-one brewing companion for the modern brewer. It lets you manage vessels, log every batch, save and refine recipes, track ingredients and equipment, calculate ABV, and keep a searchable history of everything you brew.
          </p>
          <ul className="space-y-3 text-lg opacity-90 text-center mt-10">
            <li>• Track active, secondary, and finished batches from brew day to bottle</li>
            <li>• Log gravity, dates, notes, photos, and brewer insights for every fermentation</li>
            <li>• Save and revisit recipes, ingredients, and batch details across styles and seasons</li>
            <li>• Manage your inventory and keep tabs on what you have in stock</li>
            <li>• Use ABV tools to estimate strength and plan your next brew</li>
            <li>• Visit the community forum to swap tips, ask questions, and share brewing ideas</li>
          </ul>
        </section>

        {/* Why use Batchlogg */}
        <section className="bg-black/30 backdrop-blur-md p-8 rounded-xl border border-white/10">
          <h2 className="text-3xl font-bold mb-4 text-center">Everything in one brewing workspace</h2>
          <p className="text-lg opacity-90 mb-6 text-center max-w-3xl mx-auto">
            From the dashboard to the batch history, Batchlogg gives you a clear view of the full brewing process. Build a repeatable workflow, spot patterns in your results, and keep all your brewing data in one place instead of scattered across notes, spreadsheets, and messages.
          </p>
          <ul className="space-y-3 text-lg opacity-90 text-center mt-10">
            <li>• Dashboard overview for your brewing vessels and current batches</li>
            <li>• Batch history that keeps your process searchable and easy to revisit</li>
            <li>• A personal recipe library for building and improving your best brews</li>
            <li>• Community forums, member profiles, friends, and direct messages</li>
            <li>• A social brewing space where you can connect, follow brewers, and discuss ideas</li>
            <li>• Flexible privacy settings so you can share what you want and keep the rest personal</li>
          </ul>
        </section>

        {/* For brewers, by brewers */}
        <section className="bg-black/30 backdrop-blur-md p-8 rounded-xl border border-white/10 text-center">
          <h2 className="text-3xl font-bold mb-4">For brewers, by brewers</h2>
          <p className="text-lg opacity-90 text-center max-w-3xl mx-auto">
            Batchlogg is built for brewers who want more than a basic logbook. Whether you brew at home, in a garage, or in a small setup, the platform helps you stay organized, learn from each batch, and share your work with the wider brewing community through the forum, member profiles, messages, and friends.
          </p>
        </section>

      </div>

      {/* FOOTER */}
      <p className="text-sm opacity-40 mt-20 relative z-10">
        © {new Date().getFullYear()} Batchlogg
      </p>
    </div>
  );
}
