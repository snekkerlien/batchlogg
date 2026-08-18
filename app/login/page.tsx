"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Redirect hvis bruker allerede er logget inn
  useEffect(() => {
    async function checkSession() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        router.push("/dashboard");
      }
    }
    checkSession();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const fakeEmail = `${username}@fake.local`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password
    });

    if (error || !data.session) {
      setErrorMsg("Feil brukernavn eller passord.");
      return;
    }

    // Gi Supabase tid til å skrive session-cookie
    await new Promise((resolve) => setTimeout(resolve, 50));

    router.push("/dashboard");
  }

  return (
    <div className="flex items-center justify-center h-screen bg-zinc-900">
      <form
        onSubmit={handleLogin}
        className="bg-zinc-800 p-6 rounded-xl w-80 space-y-4"
      >
        <h2 className="text-xl font-semibold text-center">Logg inn</h2>

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
          Logg inn
        </button>

        <a
          href="/signup"
          className="block text-center text-sm text-blue-400 hover:text-blue-300 mt-4"
        >
          Registrer ny konto
        </a>
      </form>
    </div>
  );
}
