"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { isDesktopApp } from "@/lib/desktopApp";

export default function HomeAuthActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState("");
  const [loadError, setLoadError] = useState("");
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabaseBrowser.auth.getSession();

        if (!active) return;
        if (error) throw new Error(`Could not restore the login session: ${error.message}`);
        setSession(currentSession);

        if (currentSession && isDesktopApp()) {
          router.replace("/dashboard");
          return;
        }

        if (currentSession) {
          const response = await fetch("/api/profile", {
            headers: { Authorization: `Bearer ${currentSession.access_token}` },
          });

          if (!active) return;
          if (!response.ok) {
            throw new Error(`Could not load the signed-in profile (${response.status}).`);
          }
          const profile = await response.json();
          setUsername(profile.username ?? "Unknown");
        }
      } catch (error) {
        console.error("Could not load the homepage account state", error);
        if (active) {
          setLoadError("Account status could not be loaded. You can still use the public pages.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSession();

    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession && isDesktopApp()) router.replace("/dashboard");
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  async function logout() {
    setLogoutError("");
    const { error } = await supabaseBrowser.auth.signOut({ scope: "local" });
    if (error) {
      console.error("Could not sign out", error);
      setLogoutError("Could not log out. Please try again.");
      return;
    }
    window.location.reload();
  }

  if (loading) {
    return <p className="mt-6 text-sm text-white/60" aria-live="polite">Loading account…</p>;
  }

  if (loadError) {
    return (
      <div className="mt-6 flex flex-col gap-4">
        <p className="text-sm text-amber-300" role="alert">{loadError}</p>
        {session && (
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-white/20 bg-white/10 p-3 font-semibold hover:bg-white/20"
          >
            Log out
          </button>
        )}
        {logoutError && (
          <p className="text-sm text-red-300" role="alert">{logoutError}</p>
        )}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mt-6 flex flex-col gap-4">
        <Link href="/auth/login" className="block rounded-lg bg-blue-600 p-3 font-semibold hover:bg-blue-700">
          Log in
        </Link>
        <Link href="/auth/signup" className="block rounded-lg bg-green-600 p-3 font-semibold hover:bg-green-700">
          Sign up
        </Link>
        <Link
          href="/download-app"
          className="text-sm font-medium text-white/70 underline decoration-white/30 underline-offset-4 hover:text-white"
        >
          Batchlogg for desktop
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <p className="text-center font-semibold text-green-300">Logged in as {username}</p>
      <button
        onClick={logout}
        className="rounded-lg border border-white/20 bg-white/10 p-3 font-semibold hover:bg-white/20"
      >
        Log out
      </button>
      <Link href="/dashboard" className="block rounded-lg bg-white/10 p-3 font-semibold hover:bg-white/20">
        Go to dashboard
      </Link>
    </div>
  );
}
