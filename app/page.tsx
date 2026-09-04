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
      <div className="text-center space-y-6 bg-black/40 backdrop-blur-md p-10 rounded-xl border border-white/10 max-w-2xl relative z-10">
        <h1 className="text-5xl font-bold">Batchlog</h1>
        <p className="text-lg opacity-80">
          Brew smarter. Log better. Keep track of vessels, batches, and recipes.
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
              className="bg-red-600 hover:bg-red-700 p-3 rounded-lg font-semibold"
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
      <div className="mt-20 max-w-3xl space-y-16 relative z-10">

        {/* What is Batchlogg */}
        <section className="bg-black/30 backdrop-blur-md p-8 rounded-xl border border-white/10">
          <h2 className="text-3xl font-bold mb-4 text-center">What is Batchlog?</h2>
          <p className="text-lg opacity-90 mb-4">
            Batchlog is a brewing companion designed to give you complete control over your brewing workflow.
            It keeps track of every vessel, every batch, and every detail — from gravity readings to tasting notes and photos.
            Whether you're experimenting with new recipes or repeating a proven favorite, Batchlog helps you stay organized,
            consistent, and confident throughout the entire brewing process.
          </p>
          <ul className="space-y-3 text-lg opacity-90">
            <li>• A clear overview of all your brewing vessels and active batches</li>
            <li>• Detailed logging of OG, FG, notes, measurements, and images</li>
            <li>• A recipe system built for saving, refining, and sharing your creations</li>
            <li>• A community section where you can explore public recipes from other brewers</li>
          </ul>
        </section>

        {/* Why use Batchlogg */}
        <section className="bg-black/30 backdrop-blur-md p-8 rounded-xl border border-white/10">
          <h2 className="text-3xl font-bold mb-4 text-center">Why use Batchlog?</h2>
          <p className="text-lg opacity-90 mb-4">
            Batchlog removes the chaos from brewing. No more scattered notes, forgotten measurements,
            or missing photos — everything is stored in one structured, easy‑to‑use system.
            It helps you improve consistency, learn from past batches, and build a brewing history you can rely on.
          </p>
          <ul className="space-y-3 text-lg opacity-90">
            <li>• Full control over your brewing process from start to finish</li>
            <li>• All your data collected in one place — clean, searchable, and safe</li>
            <li>• A smoother workflow with fewer mistakes and better repeatability</li>
            <li>• Ideal for hobby brewers, homebrewers, mead‑makers, and small craft setups</li>
          </ul>
        </section>

        {/* For brewers, by brewers */}
        <section className="bg-black/30 backdrop-blur-md p-8 rounded-xl border border-white/10 text-center">
          <h2 className="text-3xl font-bold mb-4">For brewers, by brewers</h2>
          <p className="text-lg opacity-90">
            Batchlog is made for brewers who want structure, clarity, and simplicity.
            Whether you brew in your garage or run a small brewery – this is your tool.
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
