"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../providers/useAuth";
import Link from "next/link";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";

export default function LoginClient() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);

    const username = form.get("username")?.toString() ?? "";
    const password = form.get("password")?.toString() ?? "";
    const email = `${username}@example.com`;

    const { data, error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg("Feil brukernavn eller passord.");
      return;
    }

    router.replace("/dashboard");
  }

  if (loading || user) {
    return null;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={handleLogin}
        className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-sm border border-white/10 space-y-4"
      >
        <Link
          href="/"
          prefetch={false}
          className="block text-center text-sm text-blue-300 hover:text-blue-200 mb-2"
        >
          🏠 Tilbake til forsiden
        </Link>

        <h2 className="text-2xl font-bold text-center">Logg inn</h2>

        {errorMsg && (
          <p className="text-red-400 text-center font-semibold">
            {errorMsg}
          </p>
        )}

        <input
          type="text"
          name="username"
          placeholder="Brukernavn"
          required
          className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/20"
        />

        <input
          type="password"
          name="password"
          placeholder="Passord"
          required
          className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/20"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold"
        >
          Logg inn
        </button>

        <Link
          href="/auth/signup"
          prefetch={false}
          className="block text-center text-sm text-blue-300 hover:text-blue-200 mt-2"
        >
          Registrer ny konto
        </Link>
      </form>
    </main>
  );
}
