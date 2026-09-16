"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";

export default function SignupClient() {
  const router = useRouter();
  const [error, setError] = useState("");

  function validatePassword(password: string) {
    if (password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter.";
    }
    return "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const form = new FormData(e.currentTarget);
    const username = form.get("username")?.toString().trim() ?? "";
    const email = form.get("email")?.toString().trim() ?? "";
    const password = form.get("password")?.toString() ?? "";
    const confirmPassword = form.get("confirmPassword")?.toString() ?? "";

    if (!username || !email || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Create account in Supabase Auth
    const { data, error: signupError } = await supabaseBrowser.auth.signUp({
      email,
      password,
    });

    if (signupError || !data.user) {
      console.log("[Signup error]", signupError);
      setError("Could not create account.");
      return;
    }

    // Create profile row
    await fetch("/api/profile/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: data.user.id,
        username,
        email,
      }),
    });

    // Auto-login
    const { error: loginError } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError("Could not log in after registration.");
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
          🏠 Back to homepage
        </a>

        <h2 className="text-2xl font-bold text-center">Create new account</h2>

        <input
          type="text"
          name="username"
          placeholder="Username"
          required
          className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/20"
        />

        <input
          type="email"
          name="email"
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

        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm password"
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
          Sign up
        </button>

        <a
          href="/auth/login"
          className="block text-center text-sm text-blue-300 hover:text-blue-200 mt-2"
        >
          Already have an account? Log in
        </a>
      </form>
    </main>
  );
}
