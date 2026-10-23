"use client";

import { useState } from "react";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";
import FormField from "@/app/components/FormField";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    setSending(true);

    try {
      const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });

      if (resetError) {
        setError("Could not send reset link. Please try again.");
        return;
      }

      setMsg("A reset link has been sent to your email.");
    } catch (requestError) {
      console.error("Could not send password reset link", requestError);
      setError("Could not send reset link. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-sm border border-white/10 space-y-4"
      >
        <h2 className="text-2xl font-bold text-center">Reset password</h2>

        {msg && <p role="status" className="text-green-400 text-center">{msg}</p>}
        {error && <p id="forgot-password-error" role="alert" className="text-red-400 text-center">{error}</p>}

        <FormField id="forgot-password-email" label="Email address" required>
          <input
            id="forgot-password-email"
            type="email"
            autoComplete="email"
            required
            disabled={sending}
            value={email}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "forgot-password-error" : undefined}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 focus:border-green-400 focus:outline-none"
          />
        </FormField>

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-lg bg-blue-600 p-3 font-semibold hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send reset link"}
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
