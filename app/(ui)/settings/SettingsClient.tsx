"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import JSZip from "jszip";
import MenuOverlay from "../../components/MenuOverlay";
import PageHeading from "../../components/PageHeading";
import { UnitToggle } from "../../components/Units";
import FeedbackForm from "./FeedbackForm";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import {
  deleteAccount,
  saveThemeAccentColor,
} from "../my-account/actions";
import { saveBrewingPreferences } from "@/app/actions/userPreferences";
import {
  applyAccentColor,
  DEFAULT_ACCENT_COLOR,
  isAccentColor,
} from "@/lib/theme/accentColor";
import { getErrorMessage, saveDownload } from "@/lib/desktopDownloads";
import {
  getReducedMotionPreference,
  setReducedMotionPreference,
} from "@/lib/accessibility/reducedMotion";

type RestorePreview = {
  formatVersion: number;
  exportedAt: string | null;
  username: string | null;
  included: string[];
  fileSize: number;
};

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const backupContentLabels: Record<string, string> = {
  profile: "Profile and preferences",
  batches: "Batches, measurements, and notes",
  vessels: "Vessels",
  recipes: "Recipes",
  inventory: "Inventory",
  equipment_profiles: "Equipment profiles",
  water_chemistry_profiles: "Water chemistry profiles",
  batch_notes: "Batch notes and note images",
  sg_readings: "Gravity readings",
  batch_reminders: "Brew reminders",
  vessel_contributors: "Vessel contributor records (sharing access is not recreated)",
  shopping_list: "Shopping list",
  forum_bookmarks: "Saved discussions",
  private_messages: "Private messages",
  feedback: "Feedback",
  batch_aging: "Bottle-aging records",
  batch_aging_tastings: "Bottle-aging tastings",
  profile_avatar: "Profile picture",
  batch_note_images: "Batch note images",
};

export default function SettingsClient() {
  const router = useRouter();
  const restoreInputRef = useRef<HTMLInputElement | null>(null);
  const preferencesSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingPreferencesSavesRef = useRef(0);
  const [user, setUser] = useState<any>(null);
  const [accountTier, setAccountTier] = useState<"free" | "premium">("free");
  const [username, setUsername] = useState("account");
  const [savedUsername, setSavedUsername] = useState("account");
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [themeAccentColor, setThemeAccentColor] = useState(DEFAULT_ACCENT_COLOR);
  const [savingThemeAccentColor, setSavingThemeAccentColor] = useState(false);
  const [themeAccentMessage, setThemeAccentMessage] = useState("");
  const [useInventory, setUseInventory] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState("");
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [motionPreferenceMessage, setMotionPreferenceMessage] = useState("");
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
  const [downloadProgress, setDownloadProgress] = useState("");
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [reviewingBackup, setReviewingBackup] = useState(false);
  const [restoreReviewError, setRestoreReviewError] = useState("");
  const [restoreProgress, setRestoreProgress] = useState("");
  const [restoreMessage, setRestoreMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!active) return;
      if (!session) {
        router.replace("/auth/login?redirect=/settings");
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
      setSavedUsername(profile.username || "account");
      setAccountTier(profile.account_tier === "premium" ? "premium" : "free");
      setThemeAccentColor(
        isAccentColor(profile.theme_accent_color)
          ? profile.theme_accent_color
          : DEFAULT_ACCENT_COLOR
      );
      setUseInventory(profile.use_inventory_for_batches === true);
      setPublicProfile(profile.is_public !== false);
      setRemindersEnabled(profile.batch_reminders_enabled !== false);
      setReducedMotion(getReducedMotionPreference());
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
      applyAccentColor(themeAccentColor);
      window.dispatchEvent(new Event("batchlogg-preferences-saved"));
      setThemeAccentMessage("Accent color saved.");
    } catch (error) {
      console.error("Failed to save accent color", error);
      setThemeAccentMessage("Could not save the accent color. Please try again.");
    } finally {
      setSavingThemeAccentColor(false);
    }
  }

  function saveBrewingPreference(
    preference: Partial<{
      use_inventory_for_batches: boolean;
      batch_reminders_enabled: boolean;
      is_public: boolean;
    }>
  ) {
    pendingPreferencesSavesRef.current += 1;
    setSavingPreferences(true);
    setPreferencesMessage("Saving…");

    preferencesSaveQueueRef.current = preferencesSaveQueueRef.current.then(
      async () => {
        try {
          await saveBrewingPreferences(preference);
          setPreferencesMessage("Preferences saved.");
        } catch (error) {
          console.error("Could not save brewing preferences", error);
          setPreferencesMessage("Could not save preferences. Please try again.");
        } finally {
          pendingPreferencesSavesRef.current -= 1;
          if (pendingPreferencesSavesRef.current === 0) {
            setSavingPreferences(false);
          }
        }
      }
    );
  }

  async function changeUsername(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsernameError("");
    setUsernameMessage("");
    setSavingUsername(true);

    try {
      const response = await fetch("/api/profile/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not update username.");
      }

      setUsername(result.username);
      setSavedUsername(result.username);
      setUsernameMessage("Username updated.");
    } catch (error) {
      console.error("Could not update username", error);
      setUsernameError(
        error instanceof Error ? error.message : "Could not update username."
      );
    } finally {
      setSavingUsername(false);
    }
  }

  async function changeProfileVisibility(value: boolean) {
    setSavingPrivacy(true);
    setPrivacyMessage("");
    try {
      const result = await saveBrewingPreferences({ is_public: value });
      if (result?.saved !== true) throw new Error("Profile visibility save was not confirmed");
      setPublicProfile(value);
      setPrivacyMessage("Profile visibility saved.");
    } catch (error) {
      console.error("Could not save profile visibility", error);
      setPrivacyMessage("Could not save profile visibility. Your previous setting is unchanged. Please try again.");
    } finally {
      setSavingPrivacy(false);
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
    setDownloadProgress("Preparing your ZIP export…");
    try {
      const response = await fetch("/api/account/export", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        const result: { error?: string } = await response.json();
        throw new Error(result.error || `Backup failed (${response.status})`);
      }
      setDownloadProgress("Downloading your ZIP file…");
      const filename =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? `${username}-batchlog-backup.zip`;
      await saveDownload(await response.blob(), filename);
      setDownloadProgress("Your account export is ready.");
    } catch (error) {
      console.error("Failed to export account data", error);
      setDownloadProgress("");
      setDownloadError(getErrorMessage(error, "Could not create your backup. Please try again."));
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
    setRestoreMessage("");
    setRestoreReviewError("");
    setRestorePreview(null);
    if (file.size > 50 * 1024 * 1024) {
      setPendingRestoreFile(null);
      setRestoreReviewError("Backup ZIP must be 50 MB or smaller.");
      return;
    }
    setPendingRestoreFile(file);
    setReviewingBackup(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const metadataFile = zip.file("metadata.json");
      const profileFile = zip.file("profile.json");
      if (!metadataFile || !profileFile) {
        throw new Error("This ZIP is missing the Batchlogg backup manifest or profile.");
      }
      const metadataValue: unknown = JSON.parse(await metadataFile.async("string"));
      if (!isJsonRecord(metadataValue)) {
        throw new Error("The backup manifest is not valid.");
      }
      const version = metadataValue.format_version;
      if (
        typeof version !== "number" ||
        !Number.isInteger(version) ||
        version < 1 ||
        version > 5
      ) {
        throw new Error("This backup format is not supported. Choose a Batchlogg ZIP backup.");
      }
      const included = Array.isArray(metadataValue.included)
        ? metadataValue.included.filter(
            (item): item is string => typeof item === "string"
          )
        : Object.keys(zip.files)
            .filter((name) => name.endsWith(".json") && name !== "metadata.json")
            .map((name) => name.replace(/\.json$/, ""));
      setRestorePreview({
        formatVersion: version,
        exportedAt:
          typeof metadataValue.exported_at === "string"
            ? metadataValue.exported_at
            : null,
        username:
          typeof metadataValue.username === "string"
            ? metadataValue.username
            : null,
        included,
        fileSize: file.size,
      });
    } catch (error) {
      console.error("Could not review account backup", error);
      setRestoreReviewError(
        error instanceof Error
          ? error.message
          : "Could not read this backup. Choose a valid Batchlogg ZIP."
      );
    } finally {
      setReviewingBackup(false);
    }
  }

  async function confirmRestoreBackup() {
    if (!pendingRestoreFile || !restorePreview || reviewingBackup) return;
    setRestoringBackup(true);
    setRestoreMessage("");
    setRestoreProgress("Uploading the selected ZIP…");
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseBrowser.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error("Sign in again before restoring a backup.");

      const storagePath = `${session.user.id}/${crypto.randomUUID()}.zip`;
      const { error: uploadError } = await supabaseBrowser.storage
        .from("account-backups")
        .upload(storagePath, pendingRestoreFile, {
          contentType: "application/zip",
          upsert: false,
        });
      if (uploadError) throw new Error(`Could not upload backup: ${uploadError.message}`);

      setRestoreProgress("Checking the archive and restoring your data…");
      const response = await fetch("/api/account/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath }),
        credentials: "include",
      });
      const result: { message?: string; error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? `Restore failed (${response.status})`);
      }
      setRestoreMessage(result.message ?? "Backup restored.");
      setRestoreProgress("Restore complete.");
      setPendingRestoreFile(null);
      setRestorePreview(null);
    } catch (error) {
      console.error("Failed to restore account backup", error);
      setRestoreProgress("");
      setRestoreMessage(
        error instanceof Error
          ? error.message
          : "Could not restore the backup. Please try again."
      );
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
            onClick={() => router.back()}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg"
            aria-label="Go back"
          >
            ←
          </button>
        </div>

        <PageHeading
          title="Settings"
          subtitle="Manage your preferences, security, and account data."
        />
        <section className="mb-8 flex flex-wrap justify-center gap-3 border-b border-white/10 pb-6">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("batchlogg-open-welcome-tour"))}
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Revisit the Batchlogg tour
          </button>
          {accountTier === "premium" && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("batchlogg-open-premium-welcome"))}
              className="rounded-lg border border-green-300/20 bg-green-300/5 px-4 py-2.5 text-sm font-semibold text-green-200 transition hover:bg-green-300/10"
            >
              Revisit the Premium tour
            </button>
          )}
        </section>
        {loadError && (
          <p role="alert" className="text-center text-sm text-red-400 mb-6">
            {loadError}
          </p>
        )}

        <section id="appearance-units" className="mb-8 scroll-mt-6 border-t border-white/10 py-5">
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
        <section className="mb-8 border-b border-white/10 pb-6">
          <h2 className="text-lg font-semibold text-center mb-1 text-green-300">
            Accessibility
          </h2>
          <p className="text-sm text-zinc-400 text-center mb-5">
            Reduce motion hides carbonation bubbles and minimizes animation,
            including page transitions. Your device preference is used by default.
          </p>
          <div className="mx-auto max-w-xl">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(event) => {
                  const nextValue = event.target.checked;
                  setMotionPreferenceMessage("");
                  try {
                    setReducedMotionPreference(nextValue);
                    setReducedMotion(nextValue);
                  } catch (error) {
                    console.error("Could not save reduced-motion preference", error);
                    setMotionPreferenceMessage(
                      "Could not save this preference. Check your browser storage settings and try again."
                    );
                  }
                }}
                className="mt-1 h-4 w-4 accent-green-500"
              />
              <span>
                <span className="block font-medium">Reduce motion</span>
                <span className="text-sm text-white/60">
                  Minimize animations and hide carbonation bubbles throughout the site.
                </span>
              </span>
            </label>
            {motionPreferenceMessage && (
              <p role="alert" className="mt-3 text-sm text-red-300">
                {motionPreferenceMessage}
              </p>
            )}
          </div>
        </section>
        <section id="notifications" className="mb-8 scroll-mt-6 border-b border-white/10 pb-6">
          <h2 className="text-lg font-semibold text-center mb-1 text-green-300">
            Notifications &amp; brewing preferences
          </h2>
          <p className="text-sm text-zinc-400 text-center mb-5">
            Choose how Batchlogg handles inventory and reminders.
          </p>
          <div className="mx-auto max-w-xl space-y-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={useInventory}
                onChange={(event) => {
                  const value = event.target.checked;
                  setUseInventory(value);
                  saveBrewingPreference({ use_inventory_for_batches: value });
                }}
                className="mt-1 h-4 w-4 accent-green-500"
              />
              <span>
                <span className="block font-medium">Use inventory when creating batches</span>
                <span className="text-sm text-white/60">
                  Opt in to ingredient tracking and stock deductions as the batch integration is added.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={remindersEnabled}
                onChange={(event) => {
                  const value = event.target.checked;
                  setRemindersEnabled(value);
                  saveBrewingPreference({ batch_reminders_enabled: value });
                }}
                className="mt-1 h-4 w-4 accent-green-500"
              />
              <span>
                <span className="block font-medium">Enable brew reminders</span>
                <span className="text-sm text-white/60">
                  Allow scheduled reminders and gravity-check reminders.
                </span>
              </span>
            </label>
          </div>
          <div className="mt-5 flex flex-col items-center gap-2">
            {preferencesMessage && (
              <p role="status" className="text-center text-sm text-zinc-300">
                {savingPreferences ? "Saving…" : preferencesMessage}
              </p>
            )}
          </div>
        </section>

        <section id="sharing-privacy" aria-labelledby="sharing-privacy-title" className="mb-8 scroll-mt-6 border-b border-white/10 pb-6">
          <h2 id="sharing-privacy-title" className="mb-5 text-center text-lg font-semibold text-green-300">
            Privacy and sharing
          </h2>
          <div className="mx-auto max-w-xl space-y-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={publicProfile}
                disabled={savingPrivacy}
                onChange={event => void changeProfileVisibility(event.target.checked)}
                className="mt-1 h-4 w-4 accent-green-500"
              />
              <span>
                <span className="block font-medium">Make my profile visible to the community</span>
                <span className="text-sm text-white/60">
                  {publicProfile ? "Public profile: signed-in members can see your showcase, shared vessels, public recipes, and public activity statistics." : "Private profile: other members see only your basic identity and any friend-request option. Friends can see your identity, but not your vessels or recipes through your profile."}
                </span>
              </span>
            </label>
            {privacyMessage && <p role="status" className="text-sm text-white/70">{privacyMessage}</p>}
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-semibold">Recipes</dt>
                <dd className="text-white/65">A recipe and your profile must both be public for it to appear in Public recipes. Anyone, including signed-out visitors, can read those recipes. Change each recipe in <Link href="/my-recipes" className="text-green-200 underline">My recipes</Link>.</dd>
              </div>
              <div>
                <dt className="font-semibold">Vessels and batches</dt>
                <dd className="text-white/65">Each vessel has its own visibility switch. Shared vessels can expose their current batch, ingredients, measurements, and log entries. Open a vessel from your <Link href="/dashboard" className="text-green-200 underline">dashboard</Link> to change its visibility. Changing profile visibility does not change vessel or recipe switches.</dd>
              </div>
              <div>
                <dt className="font-semibold">Forum and recipe outcomes</dt>
                <dd className="text-white/65">Forum posts, replies, and their attachments remain public when your profile is private. Finished-batch outcomes and tasting notes use separate sharing controls when finishing a batch. Making something private does not recall copies others have already saved.</dd>
              </div>
              <div>
                <dt className="font-semibold">Account details</dt>
                <dd className="text-white/65">Your email and account settings are not shown on your member profile. Your username, avatar, membership, and account tier can still identify you when your profile is private.</dd>
              </div>
            </dl>
            <Link href={`/members/${encodeURIComponent(savedUsername)}?preview=public`} className="inline-flex min-h-11 items-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
              Preview my community profile
            </Link>
            <p className="text-xs text-white/50">Uses saved settings and shows the view of a signed-in member who is not your friend, without owner or admin access.</p>
          </div>
        </section>

        <section id="profile" className="mb-8 scroll-mt-6 border-b border-white/10 pb-6">
          <h2 className="text-lg font-semibold text-center mb-1 text-green-300">
            Profile
          </h2>
          <p className="mb-4 text-center text-sm text-white/60">
            Update your username here; change your profile picture and showcase on{" "}
            <Link href="/my-account" className="text-green-200 underline">
              My Account
            </Link>.
          </p>
          <form
            onSubmit={changeUsername}
            className="mx-auto max-w-md space-y-3"
          >
            <input
              id="settings-username"
              type="text"
              aria-label="Username"
              autoComplete="username"
              maxLength={64}
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2"
            />
            {usernameError && (
              <p role="alert" className="text-sm text-red-400">
                {usernameError}
              </p>
            )}
            {usernameMessage && (
              <p role="status" className="text-sm text-green-300">
                {usernameMessage}
              </p>
            )}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={savingUsername}
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
              >
                {savingUsername ? "Saving…" : "Update username"}
              </button>
            </div>
          </form>
        </section>

        <section id="billing" className="mb-8 scroll-mt-6 border-b border-white/10 pb-6">
          <h2 className="mb-2 text-center text-lg font-semibold text-green-300">
            Billing
          </h2>
          <p className="mb-4 text-center text-sm text-white/60">
            {accountTier === "premium"
              ? "Manage your Premium plan and subscription."
              : "Compare plans and manage your Batchlogg subscription."}
          </p>
          <div className="text-center">
            <Link
              href="/premium"
              className="inline-flex rounded-lg border border-green-500/40 bg-green-800/60 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              {accountTier === "premium" ? "Manage subscription" : "View plans and billing"}
            </Link>
          </div>
        </section>

        <section id="account-recovery" className="mb-8 scroll-mt-6 border-b border-white/10 pb-10">
          <h2 className="text-lg font-semibold text-center mb-4 text-green-300">
            Account recovery &amp; security
          </h2>
          <p className="mb-5 text-center text-sm text-white/60">
            Keep your sign-in email current or change your password. If you are locked out,{" "}
            <Link href="/auth/forgot" className="text-green-200 underline">
              reset your password
            </Link>.
          </p>
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
        <section className="mb-8 border-b border-white/10 pb-6">
          <h2 className="text-lg font-semibold text-center mb-4 text-green-300">
            Feedback
          </h2>
          <FeedbackForm />
        </section>

        <section id="data" className="mb-8 scroll-mt-6 border-b border-white/10 pb-6">
          <h2 className="text-lg font-semibold text-center mb-4 text-green-300">
            Your data
          </h2>
          <div className="flex flex-col items-center gap-4">
            <div className="max-w-xl space-y-3 text-sm text-zinc-300">
              <p>
                Export creates a ZIP archive containing JSON data files and any personal profile or batch-note images. New exports use Batchlogg backup format version 5; restore accepts versions 1–5. ZIP files must be 50 MB or smaller.
              </p>
              <p>
                Included: profile preferences, vessels and batches, recipes, inventory, equipment and water profiles, notes, readings, reminders, shopping lists, saved discussions, private messages, feedback, bottle-aging data, and personal images.
              </p>
              <p>
                Not included in new exports: passwords or sign-in credentials, forum posts and replies, and friendships or community uploads. Vessel contributor records may be present, but sharing access is not recreated after restore.
              </p>
              <p>
                Restore adds records that are missing. If a record ID already exists, the existing record is kept unchanged. Archived profile settings are applied to your account; an archived username is skipped if another account is already using it. Restoring may therefore change your current profile preferences.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              disabled={showDownloadSpinner}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm disabled:opacity-60"
            >
              {showDownloadSpinner
                ? downloadProgress || "Preparing backup…"
                : "Download my data"}
            </button>
            {showDownloadSpinner && (
              <progress
                aria-label={downloadProgress || "Preparing account export"}
                className="h-2 w-full max-w-xs accent-green-500"
              />
            )}
            {downloadProgress && (
              <p role="status" className="text-center text-sm text-green-200">
                {downloadProgress}
              </p>
            )}
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
              disabled={restoringBackup || reviewingBackup}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm disabled:cursor-wait disabled:opacity-60"
            >
              {reviewingBackup
                ? "Reviewing backup…"
                : restoringBackup
                  ? restoreProgress || "Restoring backup…"
                  : "Choose a backup to restore"}
            </button>
            {reviewingBackup && (
              <p role="status" className="text-center text-sm text-white/70">
                Reading the archive for your review…
              </p>
            )}
            {pendingRestoreFile && (
              <div className="w-full max-w-xl rounded-xl border border-green-400/25 bg-green-950/20 p-4">
                <h3 className="text-base font-semibold text-green-200">
                  Review this backup before restoring
                </h3>
                {restoreReviewError ? (
                  <p role="alert" className="mt-3 text-sm text-amber-200">
                    {restoreReviewError}
                  </p>
                ) : reviewingBackup || !restorePreview ? (
                  <p role="status" className="mt-3 text-sm text-white/65">
                    Reading ZIP contents…
                  </p>
                ) : (
                  <>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-white/55">Selected file</dt>
                        <dd className="break-all">{pendingRestoreFile.name}</dd>
                      </div>
                      <div>
                        <dt className="text-white/55">Archive size</dt>
                        <dd>
                          {(restorePreview.fileSize / (1024 * 1024)).toFixed(1)} MB
                        </dd>
                      </div>
                      <div>
                        <dt className="text-white/55">Backup format</dt>
                        <dd>Batchlogg ZIP, version {restorePreview.formatVersion}</dd>
                      </div>
                      <div>
                        <dt className="text-white/55">Exported account</dt>
                        <dd>{restorePreview.username || "Not specified"}</dd>
                      </div>
                      {restorePreview.exportedAt && (
                        <div>
                          <dt className="text-white/55">Exported</dt>
                          <dd>
                            {Number.isNaN(Date.parse(restorePreview.exportedAt))
                              ? restorePreview.exportedAt
                              : new Date(restorePreview.exportedAt).toLocaleString()}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <h4 className="mt-4 font-semibold">Contents in this archive</h4>
                    <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-white/75">
                      {restorePreview.included
                        .filter((item) => item in backupContentLabels)
                        .map((item) => (
                        <li key={item}>
                          {backupContentLabels[item]}
                        </li>
                        ))}
                    </ul>
                    <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-950/25 p-3 text-sm text-amber-100">
                      <p>
                        Restore adds records whose IDs are missing; records with IDs already in your account stay unchanged. Profile preferences are restored over your current preferences, except a username already used by someone else is skipped. Passwords, sign-in credentials, forum posts/replies, friendships, community uploads, and vessel-sharing access are not restored.
                      </p>
                      <p className="mt-2">
                        If an error occurs during restore, some earlier records may already have been restored.
                      </p>
                    </div>
                  </>
                )}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingRestoreFile(null);
                      setRestorePreview(null);
                      setRestoreReviewError("");
                    }}
                    disabled={restoringBackup || reviewingBackup}
                    className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmRestoreBackup()}
                    disabled={!restorePreview || reviewingBackup || restoringBackup}
                    className="rounded-lg border border-green-500/40 bg-green-800/70 px-4 py-2 text-sm font-semibold hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {restoringBackup ? "Restoring…" : "Restore this backup"}
                  </button>
                </div>
              </div>
            )}
            {restoringBackup && (
              <div className="w-full max-w-xl" role="status" aria-live="polite">
                <p className="mb-2 text-center text-sm text-green-200">
                  {restoreProgress}
                </p>
                <progress
                  aria-label={restoreProgress || "Restoring account data"}
                  className="h-2 w-full accent-green-500"
                />
              </div>
            )}
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
            <button
            type="button"
            onClick={() => setShowDeleteConfirmation(true)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
          >
            Delete my account
          </button>
          </div>
        </section>

        <section className="mb-8 border-b border-white/10 pb-6">
          <h2 className="text-lg font-semibold text-center mb-4 text-green-300">
            About Batchlogg
          </h2>
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/changelog")}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
            >
              Changelogs
            </button>

            <button
              type="button"
              onClick={() => router.push("/terms")}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
            >
              Terms of Service
            </button>

            <button
              type="button"
              onClick={() => router.push("/privacy")}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
            >
              Privacy Policy
            </button>
          </div>
        </section>
        <div className="mt-3 pt-5 text-center">
          
        </div>

      </div>

      {showDeleteConfirmation && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center px-4">
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
        </div>,
        document.body
      )}
    </main>
  );
}
