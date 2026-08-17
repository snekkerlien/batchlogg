"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // VIKTIG: data.user.id er riktig ID
    const userId = data.user?.id;

    if (!userId) {
      setErrorMsg("Kunne ikke hente bruker-ID.");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      username
    });

    if (profileError) {
      setErrorMsg(profileError.message);
      return;
    }

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
          type="email"
          placeholder="E-post"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
