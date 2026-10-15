"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";

export default function LoginClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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

    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg("Incorrect email or password.");
      return;
    }

    router.replace(redirect || "/dashboard");
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
          <p className="text-red-400 text-center font-semibold">
            {errorMsg}
          </p>
        )}

        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Email"
          required
          className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/20"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/20"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold"
        >
          Log in
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
