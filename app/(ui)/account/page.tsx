"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { changeUsername } from "./actions";

// Client-side Supabase (for UI only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [newUsername, setNewUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<null | "ok" | "taken">(null);

  // Hent bruker + profil
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
    }

    load();
  }, []);

  // Sjekk om brukernavn er ledig
  useEffect(() => {
    if (!newUsername) {
      setUsernameStatus(null);
      return;
    }

    const check = setTimeout(async () => {
      const res = await fetch("/api/check-username?u=" + newUsername);
      const data = await res.json();
      setUsernameStatus(data.available ? "ok" : "taken");
    }, 400);

    return () => clearTimeout(check);
  }, [newUsername]);

  if (!user || !profile) {
    return (
      <main className="text-white text-center mt-20">
        Laster konto…
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto mt-20 bg-black/60 backdrop-blur-md p-8 rounded-xl border border-white/10 text-white">
      <h1 className="text-3xl font-bold mb-6 text-center">Min konto</h1>

      {/* INFO */}
      <div className="space-y-4 mb-10">
        <div>
          <p className="text-zinc-400 text-sm">Bruker-ID</p>
          <p className="font-semibold">{user.id}</p>
        </div>

        <div>
          <p className="text-zinc-400 text-sm">E‑post</p>
          <p className="font-semibold">{user.email}</p>
        </div>

        <div>
          <p className="text-zinc-400 text-sm">Brukernavn</p>
          <p className="font-semibold">{profile.username ?? "Ukjent"}</p>
        </div>

        <button
          onClick={() => setShowUsernameModal(true)}
          className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
        >
          Endre brukernavn
        </button>
      </div>

      {/* LOGG UT */}
      <form action="/logout" method="post" className="mt-10 text-center">
        <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold">
          Logg ut
        </button>
      </form>

      {/* MODAL: NYTT BRUKERNAVN */}
      {showUsernameModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-zinc-900 p-6 rounded-xl border border-white/10 w-96">
            <h2 className="text-xl font-bold mb-4">Velg nytt brukernavn</h2>

            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Nytt brukernavn"
              className="w-full p-2 rounded bg-black/40 border border-white/20"
            />

            {usernameStatus === "ok" && (
              <p className="text-green-400 mt-2">Brukernavnet er ledig</p>
            )}
            {usernameStatus === "taken" && (
              <p className="text-red-400 mt-2">Brukernavnet er allerede i bruk</p>
            )}

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setShowUsernameModal(false)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg"
              >
                Avbryt
              </button>

              <button
                disabled={usernameStatus !== "ok"}
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-zinc-600"
              >
                Fortsett
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BEKREFT MED PASSORD */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-zinc-900 p-6 rounded-xl border border-white/10 w-96">
            <h2 className="text-xl font-bold mb-4">Bekreft med passord</h2>

            <form action={changeUsername} className="space-y-4">
              <input type="hidden" name="newUsername" value={newUsername} />

              <input
                type="password"
                name="password"
                placeholder="Passord"
                className="w-full p-2 rounded bg-black/40 border border-white/20"
                required
              />

              <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold w-full">
                Bekreft endring
              </button>
            </form>

            <button
              onClick={() => setShowPasswordModal(false)}
              className="mt-4 w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
