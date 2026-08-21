"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";

export default function SignupClient() {
  const router = useRouter();
  const [error, setError] = useState("");

  function validatePassword(password: string) {
    if (password.length < 8) {
      return "Passord må være minst 8 tegn.";
    }
    if (!/[A-Z]/.test(password)) {
      return "Passord må inneholde minst én stor bokstav.";
    }
    return "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const form = new FormData(e.currentTarget);
    const username = form.get("username")?.toString() ?? "";
    const password = form.get("password")?.toString() ?? "";
    const email = `${username}@example.com`;

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    console.log("[Signup] Prøver signUp:", email);

    const { data, error: signupError } = await supabaseBrowser.auth.signUp({
      email,
      password,
    });

    console.log("[Signup] Resultat:", { data, signupError });

    if (signupError) {
      setError("Kunne ikke opprette konto.");
      return;
    }

    if (!data.user) {
      setError("Kunne ikke opprette bruker.");
      return;
    }

    // Opprett profil via API
    await fetch("/api/profile/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: data.user.id,
        username,
      }),
    });

    // Logg inn automatisk
    const { error: loginError } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError("Kunne ikke logge inn etter registrering.");
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-sm border border-white/10 space-y-4"
      >
        <a
          href="/"
          className="block text-center text-sm text-blue-300 hover:text-blue-200 mb-2"
        >
          🏠 Tilbake til forsiden
        </a>

        <h2 className="text-2xl font-bold text-center">Registrer ny konto</h2>

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

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 p-3 rounded-lg font-semibold"
        >
          Registrer
        </button>

        <a
          href="/auth/login"
          className="block text-center text-sm text-blue-300 hover:text-blue-200 mt-2"
        >
          Allerede bruker? Logg inn
        </a>
      </form>
    </main>
  );
}
