"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";

type SignupStep = "username" | "credentials";

export default function SignupClient() {
  const router = useRouter();
  const [step, setStep] = useState<SignupStep>("username");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  function validatePassword(value: string) {
    if (value.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (!/[A-Z]/.test(value)) {
      return "Password must contain at least one uppercase letter.";
    }
    return "";
  }

  async function handleUsernameSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername) {
      setError("Please choose a username.");
      return;
    }
    if (normalizedUsername.length > 64) {
      setError("Username must be 64 characters or fewer.");
      return;
    }

    setCheckingUsername(true);
    try {
      const response = await fetch(
        `/api/profile/username-availability?username=${encodeURIComponent(normalizedUsername)}`,
        { cache: "no-store" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not check username availability.");
      }
      if (!result.available) {
        setError("That username is already taken. Please choose another.");
        return;
      }

      setUsername(normalizedUsername);
      setStep("credentials");
    } catch (availabilityError) {
      console.error("Could not check username availability", availabilityError);
      setError(
        availabilityError instanceof Error
          ? availabilityError.message
          : "Could not check username availability. Please try again."
      );
    } finally {
      setCheckingUsername(false);
    }
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();
    if (!username || !normalizedEmail || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setCreatingAccount(true);
    try {
      const { data, error: signupError } = await supabaseBrowser.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (signupError || !data.user) {
        console.error("[Signup error]", signupError);
        setError(signupError?.message || "Could not create account.");
        return;
      }

      const {
        data: loginData,
        error: loginError,
      } = await supabaseBrowser.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (loginError || !loginData.session) {
        console.error("Could not log in after registration", loginError);
        setError("Could not log in after registration.");
        return;
      }

      const profileResponse = await fetch("/api/profile/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loginData.session.access_token}`,
        },
        body: JSON.stringify({
          id: data.user.id,
          username,
          email: normalizedEmail,
        }),
      });

      if (!profileResponse.ok) {
        const profileResult = await profileResponse.json().catch(() => null);
        console.error("Could not create user profile", profileResult);
        setError(
          profileResult?.error ||
            "Account created, but profile setup failed. Please contact support."
        );
        return;
      }

      router.replace("/dashboard");
    } catch (signupError) {
      console.error("Could not complete signup", signupError);
      setError("Could not complete signup. Please try again.");
    } finally {
      setCreatingAccount(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={step === "username" ? handleUsernameSubmit : handleSignup}
        className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-sm border border-white/10 space-y-4"
      >
        <a
          href="/"
          className="block text-center text-sm text-blue-300 hover:text-blue-200 mb-2"
        >
          🏠 Back to homepage
        </a>

        <h2 className="text-2xl font-bold text-center">Create new account</h2>

        {step === "username" ? (
          <>
            <p className="text-center text-sm text-white/70">
              Step 1 of 2: Choose a username
            </p>
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={username}
              maxLength={64}
              autoComplete="username"
              required
              disabled={checkingUsername}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/20"
            />
            <button
              type="submit"
              disabled={checkingUsername}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 p-3 rounded-lg font-semibold"
            >
              {checkingUsername ? "Checking…" : "Check username"}
            </button>
          </>
        ) : (
          <>
            <p className="text-center text-sm text-white/70">
              Step 2 of 2: Add your email and password
            </p>
            <p className="text-center text-sm text-green-300">
              Username “{username}” is available.
            </p>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={email}
              autoComplete="email"
              required
              disabled={creatingAccount}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/20"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={password}
              autoComplete="new-password"
              required
              disabled={creatingAccount}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/20"
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm password"
              value={confirmPassword}
              autoComplete="new-password"
              required
              disabled={creatingAccount}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/20"
            />
            <button
              type="submit"
              disabled={creatingAccount}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 p-3 rounded-lg font-semibold"
            >
              {creatingAccount ? "Creating account…" : "Create account"}
            </button>
            <button
              type="button"
              disabled={creatingAccount}
              onClick={() => {
                setError("");
                setStep("username");
              }}
              className="w-full bg-white/10 hover:bg-white/20 p-3 rounded-lg font-semibold"
            >
              Back
            </button>
          </>
        )}

        {error && (
          <p role="alert" className="text-red-400 text-sm text-center">
            {error}
          </p>
        )}

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
