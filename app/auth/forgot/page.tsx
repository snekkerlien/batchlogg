"use client";

import { useState } from "react";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");

    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email);

    if (error) {
      setError("Could not send reset link.");
      return;
    }

    setMsg("A reset link has been sent to your email.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-sm border border-white/10 space-y-4"
      >
        <h2 className="text-2xl font-bold text-center">Reset password</h2>

        {msg && <p className="text-green-400 text-center">{msg}</p>}
        {error && <p className="text-red-400 text-center">{error}</p>}

        <input
          type="email"
          placeholder="Your email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/20"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold"
        >
          Send reset link
        </button>

        <a
          href="/auth/login"
          className="block text-center text-sm text-blue-300 hover:text-blue-200 mt-2"
        >
          Back to login
        </a>
      </form>
    </main>
  );
}
