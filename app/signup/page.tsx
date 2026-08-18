"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    const fakeEmail = `${username}@fake.local`;

    const { data, error } = await supabase.auth.signUp({
      email: fakeEmail,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (!data.user?.id) {
      setErrorMsg("Kunne ikke hente bruker-ID.");
      return;
    }

    // Triggeren i databasen lager public_profiles-raden automatisk

    router.push("/login");
  }

  return (
    <div className="flex items-center justify-center h-screen bg-zinc-900">
      <form
        onSubmit={handleSignup}
        className="bg-zinc-800 p-6 rounded-xl w-80 space-y-4"
      >
        <h2 className="text-xl font-semibold text-center">Registrer konto</h2>

        <input
          type="text"
          placeholder="Brukernavn"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full p-2 rounded bg-zinc-700"
        />

        <input
          type="password"
          placeholder="Passord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 rounded bg-zinc-700"
        />

        {errorMsg && (
          <p className="text-red-400 text-sm">{errorMsg}</p>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded font-semibold"
        >
          Registrer
        </button>

        <a
          href="/login"
          className="block text-center text-sm text-blue-400 hover:text-blue-300 mt-4"
        >
          Har du konto? Logg inn
        </a>
      </form>
    </div>
  );
}
