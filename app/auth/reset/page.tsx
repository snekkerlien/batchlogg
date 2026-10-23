"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";
import FormField from "@/app/components/FormField";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<"password" | "confirm" | null>(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  function validatePassword(pw: string) {
    if (pw.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
    return "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setErrorField(null);
    setMsg("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      setErrorField("confirm");
      return;
    }

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      setErrorField("password");
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabaseBrowser.auth.updateUser({
        password,
      });

      if (updateError) {
        setError("Could not update password. Please try again.");
        return;
      }

      setMsg("Password updated successfully.");
      setTimeout(() => router.replace("/auth/login"), 1500);
    } catch (updateError) {
      console.error("Could not update password", updateError);
      setError("Could not update password. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-sm border border-white/10 space-y-4"
      >
        <h2 className="text-2xl font-bold text-center">Set new password</h2>

        {msg && <p role="status" className="text-green-400 text-center">{msg}</p>}
        {error && <p id="reset-password-error" role="alert" className="text-red-400 text-center">{error}</p>}

        <FormField
          id="reset-password"
          label="New password"
          required
          hint="At least 8 characters and one uppercase letter."
        >
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            disabled={saving}
            value={password}
            aria-invalid={errorField === "password"}
            aria-describedby={error ? "reset-password-error" : undefined}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 focus:border-green-400 focus:outline-none"
          />
        </FormField>

        <FormField id="confirm-reset-password" label="Confirm password" required>
          <input
            id="confirm-reset-password"
            type="password"
            autoComplete="new-password"
            required
            disabled={saving}
            value={confirm}
            aria-invalid={errorField === "confirm"}
            aria-describedby={error ? "reset-password-error" : undefined}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 focus:border-green-400 focus:outline-none"
          />
        </FormField>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-green-600 p-3 font-semibold hover:bg-green-700 disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? "Updating…" : "Update password"}
        </button>
      </form>
    </main>
  );
}
