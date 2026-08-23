"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { changeUsername } from "./actions";

export default function AccountPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);

  const [newUsername, setNewUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<null | "ok" | "taken">(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      const user = session.user;
      setUser(user);

      const res = await fetch("/api/profile");
      const data = await res.json();

      setProfile(data);
      setLoading(false);
    }

    load();
  }, [router]);

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

  async function toggleVisibility() {
    const newValue = !profile.is_public;

    await supabaseBrowser
      .from("profiles")
      .update({ is_public: newValue })
      .eq("id", user.id);

    setProfile((prev: any) => ({ ...prev, is_public: newValue }));
  }

  async function changePassword() {
    setPasswordError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("Alle felt må fylles ut");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Nytt passord matcher ikke bekreftelsen");
      return;
    }

    const { error: loginError } = await supabaseBrowser.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (loginError) {
      setPasswordError("Gammelt passord er feil");
      return;
    }

    const { error: updateError } = await supabaseBrowser.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setPasswordError("Kunne ikke endre passord");
      return;
    }

    setShowPasswordChangeModal(false);
    alert("Passord endret!");
  }

  if (loading) {
    return (
      <main className="text-white text-center mt-20">
        Laster konto…
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative">

        {/* Tilbake + Dashboard */}
        <div className="absolute top-4 left-4 flex gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            ← Tilbake
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold"
          >
            🏠 Dashboard
          </button>
        </div>

        {/* Logg ut + Synlighets-slider + tekst */}
        <div className="absolute top-4 right-4 flex items-center gap-4">

          <p className="text-sm opacity-80">Synlig profil</p>

          <div
            onClick={toggleVisibility}
            className={`w-14 h-7 rounded-full cursor-pointer transition relative ${
              profile.is_public ? "bg-green-500" : "bg-zinc-600"
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition ${
                profile.is_public ? "translate-x-7" : ""
              }`}
            ></div>
          </div>

          <button
            onClick={async () => {
              await supabaseBrowser.auth.signOut();
              router.replace("/auth/login");
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
          >
            Logg ut
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-center">Min konto</h1>

        {/* INFO */}
        <div className="space-y-4 mb-10 text-center">
          <div>
            <p className="text-zinc-400 text-sm">Brukernavn</p>
            <p className="font-semibold">{profile.username ?? "Ukjent"}</p>
          </div>

          <div>
            <p className="text-zinc-400 text-sm">Registrert siden</p>
            <p className="font-semibold">
              {new Date(user.created_at).toLocaleDateString("no-NO")}
            </p>
          </div>

          <div>
            <p className="text-zinc-400 text-sm">Antall kar</p>
            <p className="font-semibold">{profile.kar_count ?? 0}</p>
          </div>

          <div>
            <p className="text-zinc-400 text-sm">Antall batches</p>
            <p className="font-semibold">{profile.batch_count ?? 0}</p>
          </div>

          <div>
            <p className="text-zinc-400 text-sm">Antall oppskrifter</p>
            <p className="font-semibold">{profile.recipe_count ?? 0}</p>
          </div>
        </div>

        {/* KNAPPER – oppdatert farge */}
        <div className="grid grid-cols-2 gap-4 mb-10">

          <button
            onClick={() => setShowUsernameModal(true)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
          >
            Endre brukernavn
          </button>

          <button
            onClick={() => setShowPasswordChangeModal(true)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
          >
            Endre passord
          </button>
        </div>

        {/* MODALER — uendret */}
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

        {showPasswordChangeModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
            <div className="bg-zinc-900 p-6 rounded-xl border border-white/10 w-96">
              <h2 className="text-xl font-bold mb-4">Endre passord</h2>

              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="Gammelt passord"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full p-2 rounded bg-black/40 border border-white/20"
                />

                <input
                  type="password"
                  placeholder="Nytt passord"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 rounded bg-black/40 border border-white/20"
                />

                <input
                  type="password"
                  placeholder="Bekreft nytt passord"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2 rounded bg-black/40 border border-white/20"
                />

                {passwordError && (
                  <p className="text-red-400">{passwordError}</p>
                )}

                <button
                  onClick={changePassword}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold w-full"
                >
                  Endre passord
                </button>

                <button
                  onClick={() => setShowPasswordChangeModal(false)}
                  className="w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Fiklebrygg - Batchlogg
        </p>
      </div>
    </main>
  );
}
