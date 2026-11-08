"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";
import { inferAcquisitionSource } from "@/lib/analytics/acquisitionSource";
import FormField from "@/app/components/FormField";
import AuthRequiredLabel from "../AuthRequiredLabel";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SIGNUP_AUTH_CODE_KEYS, translateAuthApiError, translateAuthCode } from "@/lib/i18n/apiErrors";

type SignupStep = "username" | "credentials";

export default function SignupClient() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState<SignupStep>("username");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<
    "username" | "email" | "password" | "confirmPassword" | null
  >(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  function validatePassword(value: string) {
    if (value.length < 8) {
      return t("Password must be at least 8 characters.");
    }
    if (!/[A-Z]/.test(value)) {
      return t("Password must contain at least one uppercase letter.");
    }
    return "";
  }

  async function handleUsernameSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setErrorField(null);

    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername) {
      setError(t("Please choose a username."));
      setErrorField("username");
      return;
    }
    if (normalizedUsername.length > 64) {
      setError(t("Username must be 64 characters or fewer."));
      setErrorField("username");
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
        throw new Error(result.error || t("Could not check username availability."));
      }
      if (!result.available) {
        setError(t("That username is already taken. Please choose another."));
        setErrorField("username");
        return;
      }

      setUsername(normalizedUsername);
      setStep("credentials");
    } catch (availabilityError) {
      console.error("Could not check username availability", availabilityError);
      setError(
        availabilityError instanceof Error
          ? translateAuthApiError(availabilityError.message, t)
          : t("Could not check username availability. Please try again.")
      );
      setErrorField("username");
    } finally {
      setCheckingUsername(false);
    }
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setErrorField(null);

    const normalizedEmail = email.trim();
    if (!username || !normalizedEmail || !password || !confirmPassword) {
      setError(t("All fields are required."));
      setErrorField(
        !normalizedEmail
          ? "email"
          : !password
            ? "password"
            : "confirmPassword"
      );
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setErrorField("password");
      return;
    }

    if (password !== confirmPassword) {
      setError(t("Passwords do not match."));
      setErrorField("confirmPassword");
      return;
    }

    setCreatingAccount(true);
    try {
      const signupResponse = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          username,
          signupSource: inferAcquisitionSource(
            document.referrer,
            window.location.search,
            window.location.hostname
          ),
        }),
      });
      const signupResult = await signupResponse.json();

      if (!signupResponse.ok || !signupResult.userId) {
        console.error("[Signup error]", signupResult.error);
        setError(
          translateAuthCode(signupResult.code, t, SIGNUP_AUTH_CODE_KEYS) ??
          (signupResult.error ? translateAuthApiError(signupResult.error, t) : t("Could not create account."))
        );
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
        setError(t("Could not log in after registration."));
        return;
      }

      const profileResponse = await fetch("/api/profile/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loginData.session.access_token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          id: signupResult.userId,
          username,
          email: normalizedEmail,
        }),
      });

      if (!profileResponse.ok) {
        const profileResult = await profileResponse.json().catch(() => null);
        console.error("Could not create user profile", profileResult);
        const summary = t("Account created, but profile setup failed. Please contact support.");
        const detail = typeof profileResult?.error === "string"
          ? translateAuthApiError(profileResult.error, t)
          : "";
        setError(detail && detail !== summary ? `${summary} ${detail}` : summary);
        return;
      }

      window.dispatchEvent(new Event("batchlogg-profile-created"));
      router.replace("/dashboard");
    } catch (signupError) {
      console.error("Could not complete signup", signupError);
      setError(t("Could not complete signup. Please try again."));
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
          🏠 {t("Back to homepage")}
        </a>

        <h2 className="text-2xl font-bold text-center">{t("Create new account")}</h2>

        {step === "username" ? (
          <>
            <p className="text-center text-sm text-white/70">
              {t("Step 1 of 2: Choose a username")}
            </p>
            <FormField id="signup-username" label={<AuthRequiredLabel text="Username" />}>
              <input
                id="signup-username"
                type="text"
                name="username"
                value={username}
                maxLength={64}
                autoComplete="username"
                required
                disabled={checkingUsername}
                aria-invalid={errorField === "username"}
                aria-describedby={error ? "signup-error" : undefined}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 focus:border-green-400 focus:outline-none"
              />
            </FormField>
            <button
              type="submit"
              disabled={checkingUsername}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 p-3 rounded-lg font-semibold"
            >
              {checkingUsername ? t("Checking…") : t("Check username")}
            </button>
          </>
        ) : (
          <>
            <p className="text-center text-sm text-white/70">
              {t("Step 2 of 2: Add your email and password")}
            </p>
            <p className="text-center text-sm text-green-300">
              {t("Username")} “{username}” {t("is available.")}
            </p>
            <FormField id="signup-email" label={<AuthRequiredLabel text="Email address" />}>
              <input
                id="signup-email"
                type="email"
                name="email"
                value={email}
                autoComplete="email"
                required
                disabled={creatingAccount}
                aria-invalid={errorField === "email"}
                aria-describedby={error ? "signup-error" : undefined}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 focus:border-green-400 focus:outline-none"
              />
            </FormField>
            <FormField
              id="signup-password"
              label={<AuthRequiredLabel text="Password" />}
              hint={t("At least 8 characters and one uppercase letter.")}
            >
              <input
                id="signup-password"
                type="password"
                name="password"
                value={password}
                autoComplete="new-password"
                required
                disabled={creatingAccount}
                aria-invalid={errorField === "password"}
                aria-describedby={error ? "signup-error" : undefined}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 focus:border-green-400 focus:outline-none"
              />
            </FormField>
            <FormField id="signup-confirm-password" label={<AuthRequiredLabel text="Confirm password" />}>
              <input
                id="signup-confirm-password"
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                autoComplete="new-password"
                required
                disabled={creatingAccount}
                aria-invalid={errorField === "confirmPassword"}
                aria-describedby={error ? "signup-error" : undefined}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 focus:border-green-400 focus:outline-none"
              />
            </FormField>
            <button
              type="submit"
              disabled={creatingAccount}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 p-3 rounded-lg font-semibold"
            >
              {creatingAccount ? t("Creating account…") : t("Create account")}
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
              {t("Back")}
            </button>
          </>
        )}

        {error && (
          <p id="signup-error" role="alert" className="text-red-400 text-sm text-center">
            {error}
          </p>
        )}

        <a
          href="/auth/login"
          className="block text-center text-sm text-blue-300 hover:text-blue-200 mt-2"
        >
          {t("Already have an account? Log in")}
        </a>
      </form>
    </main>
  );
}
