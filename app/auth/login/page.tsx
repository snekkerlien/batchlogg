"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../providers/useAuth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const [errorMsg, setErrorMsg] = useState("");

  // Hvis bruker allerede er innlogget → redirect til dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  // Les ?error=1 fra URL
  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "1") {
      setErrorMsg("Feil brukernavn eller passord.");
    }
  }, [searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        action="/auth/loginAction"
        method="post"
        className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-sm border border-white/10 space-y-4"
      >
        {/* HOME-KNAPP */}
        <Link
          href="/"
          prefetch={false}
          className="block text-center text-sm text-blue-300 hover:text-blue-200 mb-2"
        >
          🏠 Tilbake til forsiden
        </Link>

        <h2 className="text-2xl font-bold text-center">Logg inn</h2>

        {/* 🔥 FEILMELDING */}
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
