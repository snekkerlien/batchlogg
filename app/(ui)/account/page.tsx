"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { changeUsername } from "./actions";
import MenuOverlay from "./MenuOverlay";

export default function AccountPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);

  const [newUsername, setNewUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<null | "ok" | "taken">(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

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

    const res = await fetch("/api/profile", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const data = await res.json();

    setProfile(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [router]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

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
      setPasswordError("All fields must be filled out");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password does not match confirmation");
      return;
    }

    const { error: loginError } = await supabaseBrowser.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (loginError) {
      setPasswordError("Old password is incorrect");
      return;
    }

    const { error: updateError } = await supabaseBrowser.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setPasswordError("Could not change password");
      return;
    }

    setShowPasswordChangeModal(false);
    alert("Password changed!");
  }

  if (loading) {
    return (
      <main className="text-white text-center mt-20">
        Loading account…
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative pt-16 sm:pt-0">

        {/* MENU BUTTON */}
        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay />
        </div>

        {/* BACK BUTTON */}
        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <button
            onClick={() => window.history.back()}
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
        </div>

        <h1 className="text-3xl font-bold mb-6 text-center">My Account</h1>

        {/* INFO */}
        <div className="space-y-4 mb-10 text-center">
          <div>
            <p className="text-zinc-400 text-sm">Username</p>
            <p className="font-semibold">
              {profile.username
                ? profile.username.charAt(0).toUpperCase() + profile.username.slice(1)
                : "Unknown"}
            </p>
          </div>

          <div>
            <p className="text-zinc-400 text-sm">Registered since</p>
            <p className="font-semibold">
              {new Date(user.created_at).toLocaleDateString("en-GB")}
            </p>
          </div>

          <div>
            <p className="text-zinc-400 text-sm">Number of vessels</p>
            <p className="font-semibold">{profile.kar_count ?? 0}</p>
          </div>

          <div>
            <p className="text-zinc-400 text-sm">Number of batches</p>
            <p className="font-semibold">{profile.batch_count ?? 0}</p>
          </div>

          <div>
            <p className="text-zinc-400 text-sm">Number of recipes</p>
            <p className="font-semibold">{profile.recipe_count ?? 0}</p>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <button
            onClick={() => setShowUsernameModal(true)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
          >
            Change username
          </button>

          <button
            onClick={() => setShowPasswordChangeModal(true)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
          >
            Change password
          </button>
        </div>

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Fiklebrygg - Batchlogg
        </p>
      </div>
    </main>
  );
}
