"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/app/providers/AuthProvider";
import { useUnits } from "@/app/components/Units";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { saveUserPreferences } from "@/app/actions/userPreferences";
import {
  DEFAULT_ACCENT_COLOR,
  isAccentColor,
} from "@/lib/theme/accentColor";
import { isUnitSystem, type UnitSystem } from "@/lib/units";

type SetupStage = "welcome" | "preferences" | null;

export default function FirstLoginSetup() {
  const { user } = useAuthContext();
  const { setSystem } = useUnits();
  const [stage, setStage] = useState<SetupStage>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [useInventory, setUseInventory] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) {
      setStage(null);
      return;
    }

    async function loadProfile() {
      setLoading(true);
      setError("");
      try {
        const { data: { session }, error: sessionError } =
          await supabaseBrowser.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) return;

        const response = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Could not load onboarding profile (${response.status})`);
        }
        const profile = await response.json();
        if (!active) return;

        setUsername(profile.username || "brewer");
        setAccentColor(
          isAccentColor(profile.theme_accent_color)
            ? profile.theme_accent_color
            : DEFAULT_ACCENT_COLOR
        );
        setUnitSystem(
          isUnitSystem(profile.preferred_unit_system)
            ? profile.preferred_unit_system
            : "metric"
        );
        setUseInventory(profile.use_inventory_for_batches === true);
        setPublicProfile(profile.is_public !== false);
        setRemindersEnabled(profile.batch_reminders_enabled !== false);
        if (profile.onboarding_completed === false) setStage("welcome");
      } catch (loadError) {
        console.error("Could not load first-login setup", loadError);
        if (active) setError("Your welcome setup could not be loaded. Please reload to try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    function onProfileCreated() {
      void loadProfile();
    }

    window.addEventListener("batchlogg-profile-created", onProfileCreated);
    void loadProfile();
    return () => {
      active = false;
      window.removeEventListener("batchlogg-profile-created", onProfileCreated);
    };
  }, [user?.id]);

  async function finishSetup() {
    setSaving(true);
    setError("");
    try {
      await saveUserPreferences({
        theme_accent_color: accentColor,
        preferred_unit_system: unitSystem,
        use_inventory_for_batches: useInventory,
        batch_reminders_enabled: remindersEnabled,
        is_public: publicProfile,
        onboarding_completed: true,
      });
      document.documentElement.style.setProperty("--user-accent", accentColor);
      window.dispatchEvent(new Event("batchlogg-preferences-saved"));
      setSystem(unitSystem);
      setStage(null);
    } catch (saveError) {
      console.error("Could not save first-login setup", saveError);
      setError("Your preferences could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !stage) {
    return error ? (
      <p role="alert" className="fixed bottom-4 right-4 z-[120] max-w-sm rounded-lg border border-amber-400/40 bg-zinc-950 p-3 text-sm text-amber-200">
        {error}
      </p>
    ) : null;
  }

  const checkboxClass = "h-4 w-4 accent-green-500";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-login-title"
        className="max-h-[min(90vh,52rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950 p-6 text-white shadow-2xl sm:p-8"
      >
        {stage === "welcome" ? (
          <div className="py-5 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-300">
              Welcome to Batchlogg
            </p>
            <h1 id="first-login-title" className="mt-3 text-3xl font-bold">
              Welcome, {username}!
            </h1>
            <p className="mx-auto mt-4 max-w-md leading-7 text-white/75">
              Your brewing workspace is ready. Track batches from brew day onward,
              keep recipes and inventory together, and choose how Batchlogg works for you.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setStage("preferences")}
                className="rounded-lg bg-green-700 px-5 py-3 font-semibold hover:bg-green-600"
              >
                Set up my preferences
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void finishSetup()}
                className="rounded-lg border border-white/20 bg-white/10 px-5 py-3 font-semibold hover:bg-white/20 disabled:opacity-50"
              >
                Skip for now
              </button>
            </div>
            {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-300">
              A few quick choices
            </p>
            <h1 id="first-login-title" className="mt-2 text-2xl font-bold">
              Set up your profile
            </h1>
            <p className="mt-2 text-sm text-white/65">
              You can change these any time in Settings.
            </p>

            <div className="mt-6 space-y-5">
              <label className="flex items-center justify-between gap-4">
                <span>
                  <span className="block font-medium">Site accent color</span>
                  <span className="text-sm text-white/60">Choose your highlight color.</span>
                </span>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(event) => setAccentColor(event.target.value)}
                  aria-label="Choose site accent color"
                  className="h-10 w-14 cursor-pointer rounded border border-white/20 bg-transparent p-1"
                />
              </label>

              <fieldset>
                <legend className="font-medium">Preferred units</legend>
                <div className="mt-2 flex flex-wrap gap-3">
                  {([
                    ["metric", "Metric (L, kg)"],
                    ["imperial", "Imperial (gal, lb)"],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="onboarding-units"
                        value={value}
                        checked={unitSystem === value}
                        onChange={() => setUnitSystem(value)}
                        className={checkboxClass}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={useInventory}
                  onChange={(event) => setUseInventory(event.target.checked)}
                  className={`${checkboxClass} mt-1`}
                />
                <span>
                  <span className="block font-medium">Use my inventory when creating batches</span>
                  <span className="text-sm text-white/60">
                    Turn this on to opt into ingredient tracking and stock deductions as that integration is added.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={publicProfile}
                  onChange={(event) => setPublicProfile(event.target.checked)}
                  className={`${checkboxClass} mt-1`}
                />
                <span>
                  <span className="block font-medium">Make my profile visible to the community</span>
                  <span className="text-sm text-white/60">
                    You can still choose visibility for individual fermentation vessels.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={remindersEnabled}
                  onChange={(event) => setRemindersEnabled(event.target.checked)}
                  className={`${checkboxClass} mt-1`}
                />
                <span>
                  <span className="block font-medium">Enable brew reminders</span>
                  <span className="text-sm text-white/60">
                    Allow scheduled reminders and gravity-check reminders.
                  </span>
                </span>
              </label>
            </div>

            {error && <p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}
            <div className="mt-7 flex flex-col-reverse justify-between gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setStage("welcome")}
                disabled={saving}
                className="rounded-lg border border-white/20 bg-white/10 px-5 py-3 font-semibold hover:bg-white/20 disabled:opacity-50"
              >
                Back
              </button>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void finishSetup()}
                  className="rounded-lg bg-green-700 px-5 py-3 font-semibold hover:bg-green-600 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save and continue"}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
