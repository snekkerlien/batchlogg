"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";
import FormField from "@/app/components/FormField";

export default function LoginClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function checkSession() {
      await supabaseBrowser.auth.getSession();
      setLoading(false);
    }

    checkSession();
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    const form = new FormData(e.currentTarget);
    const email = form.get("email")?.toString().trim() ?? "";
    const password = form.get("password")?.toString() ?? "";

    if (!email || !password) {
      setErrorMsg("Please enter your email address and password.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");

    setSubmitting(true);
    try {
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg("Incorrect email or password.");
        return;
      }
      if (!data.session) {
        setErrorMsg("Could not establish a login session. Please try again.");
        return;
      }

      const sessionResponse = await fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ session: data.session }),
      });
      const result: { error?: string } = await sessionResponse.json();
      if (!sessionResponse.ok) {
        setErrorMsg(result.error || "Could not synchronize your login. Please try again.");
        return;
      }
      router.replace(redirect || "/dashboard");
    } catch (loginError) {
      console.error("Could not complete login", loginError);
      setErrorMsg("Could not log in. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }


  if (loading) return null;

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
          🏠 Back to homepage
        </Link>

        <h2 className="text-2xl font-bold text-center">Log in</h2>

        {errorMsg && (
          <p id="login-error" role="alert" className="text-red-400 text-center font-semibold">
            {errorMsg}
          </p>
        )}

        <FormField id="login-email" label="Email address" required>
          <input
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            disabled={submitting}
            aria-invalid={Boolean(errorMsg)}
            aria-describedby={errorMsg ? "login-error" : undefined}
            className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 focus:border-green-400 focus:outline-none"
          />
        </FormField>

        <FormField id="login-password" label="Password" required>
          <input
            id="login-password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            disabled={submitting}
            aria-invalid={Boolean(errorMsg)}
            aria-describedby={errorMsg ? "login-error" : undefined}
            className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 focus:border-green-400 focus:outline-none"
          />
        </FormField>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 p-3 font-semibold hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>

        <Link
          href="/auth/signup"
          prefetch={false}
          className="block text-center text-sm text-blue-300 hover:text-blue-200 mt-2"
        >
          Create new account
        </Link>

        <Link
          href="/auth/forgot"
          prefetch={false}
          className="block text-center text-sm text-blue-300 hover:text-blue-200 mt-1"
        >
          Forgot password?
        </Link>
      </form>
    </main>
  );
}
