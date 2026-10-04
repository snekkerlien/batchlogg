"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MenuOverlay from "../../components/MenuOverlay";
import ConfirmDialog from "../../components/ConfirmDialog";
import PageHeading from "../../components/PageHeading";
import { UnitToggle } from "../../components/Units";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import {
  deleteAccount,
  downloadUserData,
  saveThemeAccentColor,
} from "../my-account/actions";
import {
  DEFAULT_ACCENT_COLOR,
  isAccentColor,
} from "@/lib/theme/accentColor";

export default function SettingsPage() {
  const router = useRouter();
  const restoreInputRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("account");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [themeAccentColor, setThemeAccentColor] = useState(DEFAULT_ACCENT_COLOR);
  const [savingThemeAccentColor, setSavingThemeAccentColor] = useState(false);
  const [themeAccentMessage, setThemeAccentMessage] = useState("");
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [showDownloadSpinner, setShowDownloadSpinner] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const [restoreMessage, setRestoreMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!active) return;
      if (!session) {
        router.replace("/auth/login");
        return;
      }
      setUser(session.user);
      setNewEmail(session.user.email || "");

      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Could not load settings (${response.status})`);
      }

      const profile = await response.json();
      if (!active) return;
      setUsername(profile.username || "account");
      setThemeAccentColor(
        isAccentColor(profile.theme_accent_color)
          ? profile.theme_accent_color
          : DEFAULT_ACCENT_COLOR
      );
      setLoading(false);
    }

    loadSettings().catch((error) => {
      console.error("Failed to load settings", error);
      if (active) {
        setLoadError("Could not load settings. Please reload and try again.");
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  async function saveAccentColor() {
    setSavingThemeAccentColor(true);
    setThemeAccentMessage("");
    try {
      await saveThemeAccentColor(themeAccentColor);
      document.documentElement.style.setProperty("--user-accent", themeAccentColor);
      setThemeAccentMessage("Accent color saved.");
    } catch (error) {
      console.error("Failed to save accent color", error);
      setThemeAccentMessage("Could not save the accent color. Please try again.");
    } finally {
      setSavingThemeAccentColor(false);
    }
  }

  async function changeEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError("");
    setEmailMessage("");

    const requestedEmail = newEmail.trim();
    if (!requestedEmail) {
      setEmailError("Enter an email address.");
      return;
    }
    if (requestedEmail.toLowerCase() === user?.email?.toLowerCase()) {
      setEmailError("Enter an email address different from your current one.");
      return;
    }

    setSavingEmail(true);
    try {
      const { error } = await supabaseBrowser.auth.updateUser({
        email: requestedEmail,
      });
      if (error) throw error;
      setShowEmailChange(false);
      setEmailMessage(
        "Confirmation instructions have been sent. Your email changes after you confirm."
      );
    } catch (error) {
      console.error("Failed to request email change", error);
      setEmailError(
        error instanceof Error
          ? error.message
          : "Could not update your email address. Please try again."
      );
    } finally {
      setSavingEmail(false);
    }
  }

  async function changePassword() {
    setPasswordError("");
    setPasswordMessage("");
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields must be filled out");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password does not match confirmation");
      return;
    }

    const { error: loginError } = await supabaseBrowser.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });
    if (loginError) {
      setPasswordError("Old password is incorrect");
      return;
    }

    const { error: updateError } = await supabaseBrowser.auth.updateUser({
      password: newPassword,
    });
    if (updateError) {
      setPasswordError("Could not change password");
      return;
    }

    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordChange(false);
    setPasswordMessage("Password changed.");
  }

  async function handleDeleteAccount() {
    setDeleteError("");
    if (!deletePassword) {
      setDeleteError("You must enter your password");
      return;
    }

    const { error: loginError } = await supabaseBrowser.auth.signInWithPassword({
      email: user.email,
      password: deletePassword,
    });
    if (loginError) {
      setDeleteError("Incorrect password");
      return;
    }

    await deleteAccount();
    await supabaseBrowser.auth.signOut();
    router.replace("/auth/login");
  }

  async function handleDownload() {
    setShowDownloadSpinner(true);
    setDownloadError("");
    try {
      const base64 = await downloadUserData();
      const bytes = Uint8Array.from(atob(base64), (character) =>
        character.charCodeAt(0)
      );
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/zip" })
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${username} profile data - Batchlog.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export account data", error);
      setDownloadError("Could not create your backup. Please try again.");
    } finally {
      setShowDownloadSpinner(false);
    }
  }

  async function handleRestoreFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPendingRestoreFile(file);
  }

  async function confirmRestoreBackup() {
    if (!pendingRestoreFile) return false;
    setRestoringBackup(true);
    setRestoreMessage("");
    try {
      const formData = new FormData();
      formData.append("backup", pendingRestoreFile);
      const response = await fetch("/api/account/restore", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const result: { message?: string; error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? `Restore failed (${response.status})`);
      }
      setRestoreMessage(result.message ?? "Backup restored.");
      return true;
    } catch (error) {
      console.error("Failed to restore account backup", error);
      setRestoreMessage(
        error instanceof Error
          ? error.message
          : "Could not restore the backup. Please try again."
      );
      return false;
    } finally {
      setRestoringBackup(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10">
          Loading settings…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative pt-16 sm:pt-16">
        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay current="settings" />
        </div>
        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <button
            onClick={() => router.push("/my-account")}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg"
            aria-label="Back to my account"
          >
            ←
          </button>
        </div>

        <PageHeading
          title="Settings"
          subtitle="Manage your preferences, security, and account data."
        />
        {loadError && (
          <p role="alert" className="text-center text-sm text-red-400 mb-6">
            {loadError}
          </p>
        )}

        <section className="mb-8 border-t border-white/10 py-5">
          <h2 className="text-lg font-semibold text-center mb-1 text-green-300">
            Units
          </h2>
          <p className="text-sm text-zinc-400 text-center mb-4">
            Choose how volumes and weights are shown across the site.
          </p>
          <UnitToggle />
        </section>

        <section className="mb-8 border-y border-white/10 py-5">
          <h2 className="text-lg font-semibold text-center mb-1 text-green-300">
            Site accent color
          </h2>
          <p className="text-sm text-zinc-400 text-center mb-4">
            Customize the site highlights.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <span>Color</span>
              <input
                type="color"
                value={themeAccentColor}
                onChange={(event) => setThemeAccentColor(event.target.value)}
                aria-label="Choose site accent color"
                className="h-9 w-12 cursor-pointer rounded border border-white/20 bg-transparent p-1"
              />
            </label>
            <button
              type="button"
              onClick={saveAccentColor}
              disabled={savingThemeAccentColor}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
            >
              {savingThemeAccentColor ? "Saving…" : "Save color"}
            </button>
          </div>
          {themeAccentMessage && (
            <p role="status" className="mt-3 text-center text-sm text-zinc-300">
              {themeAccentMessage}
            </p>
          )}
        </section>

        <section className="mb-8 border-b border-white/10 pb-10">
          <h2 className="text-lg font-semibold text-center mb-4 text-green-300">
            Security
          </h2>
          {!showEmailChange ? (
            <div className="mx-auto mb-6 max-w-md text-center">
              <button
                type="button"
                onClick={() => {
                  setNewEmail(user?.email || "");
                  setEmailError("");
                  setEmailMessage("");
                  setShowEmailChange(true);
                }}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
              >
                Change email address
              </button>
              {emailMessage && (
                <p role="status" className="mt-3 text-sm text-green-300">
                  {emailMessage}
                </p>
              )}
            </div>
          ) : (
            <form
              onSubmit={changeEmail}
              className="mx-auto mb-6 max-w-md space-y-3"
            >
              <label className="block text-sm text-zinc-300" htmlFor="settings-email">
                New email address
              </label>
              <input
                id="settings-email"
                type="email"
                autoComplete="email"
                required
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2"
              />
              {emailError && (
                <p role="alert" className="text-sm text-red-400">
                  {emailError}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setNewEmail(user?.email || "");
                    setEmailError("");
                    setShowEmailChange(false);
                  }}
                  disabled={savingEmail}
                  className="rounded border border-white/20 bg-white/10 px-3 py-2 hover:bg-white/20 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEmail}
                  className="rounded border border-white/20 bg-white/10 px-3 py-2 font-semibold hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
                >
                  {savingEmail ? "Sending confirmation…" : "Save email"}
                </button>
              </div>
            </form>
          )}
          {!showPasswordChange ? (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowPasswordChange(true)}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
              >
                Change password
              </button>
              {passwordMessage && (
                <p role="status" className="mt-3 text-sm text-zinc-300">
                  {passwordMessage}
                </p>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-md space-y-3">
              <input
                type="password"
                placeholder="Old password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700"
              />
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700"
              />
              {passwordError && (
                <p role="alert" className="text-sm text-red-400">
                  {passwordError}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordChange(false)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={changePassword}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded"
                >
                  Save password
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="border-b border-white/10 pb-6">
          <h2 className="text-lg font-semibold text-center mb-4 text-green-300">
            Data &amp; account
          </h2>
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={handleDownload}
              disabled={showDownloadSpinner}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm disabled:opacity-60"
            >
              {showDownloadSpinner ? "Preparing backup…" : "Download my data"}
            </button>
            <input
              ref={restoreInputRef}
              type="file"
              accept=".zip,application/zip"
              onChange={handleRestoreFileChange}
              className="hidden"
              aria-label="Choose Batchlog backup ZIP"
            />
            <button
              type="button"
              onClick={() => restoreInputRef.current?.click()}
              disabled={restoringBackup}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm disabled:cursor-wait disabled:opacity-60"
            >
              {restoringBackup ? "Restoring backup…" : "Restore from backup"}
            </button>
            {downloadError && (
              <p role="alert" className="text-center text-sm text-red-400">
                {downloadError}
              </p>
            )}
            {restoreMessage && (
              <p role="status" className="text-center text-sm text-zinc-300">
                {restoreMessage}
              </p>
            )}
            <div className="mt-3 border-t border-white/10 pt-5 text-center">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmation(true)}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
              >
                Delete my account
              </button>
              <p className="mt-3 text-sm text-zinc-400">
                Permanently remove your account and all associated data.
              </p>
            </div>
          </div>
        </section>

        <p className="text-sm opacity-40 mt-10 text-center">
          © {new Date().getFullYear()} Batchlog
        </p>
      </div>

      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 p-6 rounded-xl w-full max-w-md border border-white/10">
            <h2 className="text-xl font-bold mb-4">Delete account</h2>
            <p className="text-sm text-zinc-300 mb-4">
              This action is permanent. All your batches, recipes, vessels and
              your profile will be deleted forever.
            </p>
            <label className="block text-sm text-zinc-400 mb-2">
              Confirm with your password
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              placeholder="Password"
              className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700"
            />
            {deleteError && (
              <p role="alert" className="text-red-400 mt-2">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={pendingRestoreFile !== null}
        title="Restore backup?"
        message="Add missing batches, vessels, and recipes from this backup? Existing records and your current profile settings will be left unchanged."
        confirmLabel="Restore backup"
        onConfirm={confirmRestoreBackup}
        onCancel={() => setPendingRestoreFile(null)}
      />
    </main>
  );
}
