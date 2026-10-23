"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/app/providers/AuthProvider";
import { useUnits } from "@/app/components/Units";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { saveUserPreferences } from "@/app/actions/userPreferences";
import {
  getReducedMotionPreference,
  setReducedMotionPreference,
} from "@/lib/accessibility/reducedMotion";
import {
  applyAccentColor,
  DEFAULT_ACCENT_COLOR,
  isAccentColor,
} from "@/lib/theme/accentColor";
import { isUnitSystem, type UnitSystem } from "@/lib/units";

type SetupStage = "welcome" | "preferences" | null;

export default function FirstLoginSetup() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { setSystem } = useUnits();
  const [stage, setStage] = useState<SetupStage>(null);
  const isOpen = stage !== null;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [useInventory, setUseInventory] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    function reopenWelcomeTour() {
      setError("");
      setStage("welcome");
    }
    window.addEventListener("batchlogg-open-welcome-tour", reopenWelcomeTour);

    let active = true;
    if (!user) {
      setStage(null);
      return () => {
        window.removeEventListener("batchlogg-open-welcome-tour", reopenWelcomeTour);
      };
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
        setReducedMotion(getReducedMotionPreference());
        if (profile.onboarding_completed === false) setStage("welcome");
      } catch (loadError) {
        console.error("Could not load first-login setup", loadError);
        if (active) setError("");
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
      window.removeEventListener("batchlogg-open-welcome-tour", reopenWelcomeTour);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  async function finishSetup() {
    setSaving(true);
    setError("");
    try {
      setReducedMotionPreference(reducedMotion);
      await saveUserPreferences({
        theme_accent_color: accentColor,
        preferred_unit_system: unitSystem,
        use_inventory_for_batches: useInventory,
        batch_reminders_enabled: remindersEnabled,
        is_public: publicProfile,
        onboarding_completed: true,
      });
      applyAccentColor(accentColor);
      window.dispatchEvent(new Event("batchlogg-preferences-saved"));
      setSystem(unitSystem);
      setStage(null);
      window.dispatchEvent(new Event("batchlogg-onboarding-completed"));
      return true;
    } catch (saveError) {
      console.error("Could not save first-login setup", saveError);
      setError("Your preferences could not be saved. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function openFeature(href: string) {
    if (await finishSetup()) router.push(href);
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
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-hidden bg-black/75 p-3 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-login-title"
        className={`max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-zinc-950 p-6 text-white shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-8 ${
          stage === "welcome" ? "max-w-3xl" : "max-w-xl"
        }`}
      >
        {stage === "welcome" ? (
          <div className="py-1">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-300">
              Welcome to Batchlogg
            </p>
            <h1 id="first-login-title" className="mt-3 text-3xl font-bold">
              Welcome, {username}!
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-white/70">
              Your brewing workspace brings the whole hobby together. Here are a few
              places to start—explore in any order, and come back to the rest whenever
              you like.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                {
                  href: "/my-recipes",
                  label: "My Recipes",
                  description: "Create, organize, and refine the recipes you brew.",
                  number: "01",
                },
                {
                  href: "/dashboard",
                  label: "Batches & fermentation",
                  description: "Follow active batches with gravity readings, notes, and reminders.",
                  number: "02",
                },
                {
                  href: "/inventory",
                  label: "Inventory",
                  description: "Keep track of ingredients and brewing supplies.",
                  number: "03",
                },
                {
                  href: "/abv-tools",
                  label: "Brewing calculators",
                  description: "Use practical tools for common brewing calculations.",
                  number: "04",
                },
                {
                  href: "/batch-history",
                  label: "Batch history",
                  description: "Look back at finished batches and the details you recorded.",
                  number: "05",
                },
                {
                  href: "/community/forum",
                  label: "Community forum",
                  description: "Share ideas and learn from other brewers.",
                  number: "06",
                },
              ].map((feature) => (
                <Link
                  key={feature.href}
                  href={feature.href}
                  onClick={(event) => {
                    event.preventDefault();
                    if (!saving) void openFeature(feature.href);
                  }}
                  className="group rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-green-300/30 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-white/90">{feature.label}</span>
                    <span className="text-xs font-semibold tracking-widest text-green-300/70">
                      {feature.number}
                    </span>
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-white/55">
                    {feature.description}
                  </span>
                  <span className="mt-3 block text-xs font-semibold text-green-200 opacity-80 group-hover:opacity-100">
                    Explore <span aria-hidden="true">→</span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center">
              <p className="text-xs text-white/45">
                Your plan includes the features shown here. You can explore at your own pace.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setStage("preferences")}
                  className="rounded-lg border border-white/20 bg-white/10 px-5 py-3 font-semibold hover:bg-white/20 disabled:opacity-50"
                >
                  Choose your preferences
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void finishSetup()}
                  className="rounded-lg bg-green-700 px-5 py-3 font-semibold hover:bg-green-600 disabled:opacity-50"
                >
                  Start brewing
                </button>
              </div>
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
                  checked={reducedMotion}
                  onChange={(event) => setReducedMotion(event.target.checked)}
                  className={`${checkboxClass} mt-1`}
                />
                <span>
                  <span className="block font-medium">Reduce motion</span>
                  <span className="text-sm text-white/60">
                    Hide carbonation bubbles throughout the site.
                  </span>
                </span>
              </label>

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
                  className="rounded-lg border border-white/20 bg-white/10 px-5 py-3 font-semibold hover:bg-white/20 disabled:opacity-50"
                >
                  Skip preferences
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void finishSetup()}
                  className="rounded-lg bg-green-700 px-5 py-3 font-semibold hover:bg-green-600 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save preferences"}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
