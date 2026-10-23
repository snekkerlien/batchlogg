"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/app/providers/AuthProvider";
import {
  dismissPremiumWelcome,
  getPremiumWelcomeStatus,
} from "@/app/actions/batchGuide";

const premiumFeatures = [
  {
    href: "/dashboard",
    title: "More room to brew",
    description: "Track up to 20 vessels instead of the Free plan's 6.",
    label: "Grow your setup",
  },
  {
    href: "/calendar",
    title: "Brew Calendar",
    description: "See batch dates and scheduled reminders together, and export them to your calendar app.",
    label: "Plan ahead",
  },
  {
    href: "/shopping-list",
    title: "Shopping List",
    description: "Plan recipe ingredients and turn low-stock inventory into a restock list.",
    label: "Get organized",
  },
  {
    href: "/brew-insights",
    title: "Brewing Insights",
    description: "Review batch outcomes and learn from the numbers across your brewing history.",
    label: "Learn from results",
  },
  {
    href: "/dashboard",
    title: "Gravity graphs & current ABV",
    description: "See a batch's specific-gravity development graph and current ABV. Gravity readings are available on every plan.",
    label: "Follow fermentation",
  },
  {
    href: "/dashboard",
    title: "Vessel collaboration",
    description: "Invite friends to shared vessels and review their activity history.",
    label: "Brew together",
  },
  {
    href: "/my-recipes",
    title: "Recipe version history",
    description: "Save recipe snapshots as you edit, then view and compare earlier versions.",
    label: "Keep your recipe history",
  },
  {
    href: "/my-recipes",
    title: "Recipe exports",
    description: "Export recipes as JSON or CSV, plus BeerXML for beer and braggot or BeerJSON.",
    label: "Take recipes with you",
  },
] as const;

export default function PremiumWelcome() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const checkingRef = useRef(false);

  const checkEligibility = useCallback(async () => {
    if (!user || checkingRef.current || saving) return;
    checkingRef.current = true;
    try {
      const status = await getPremiumWelcomeStatus();
      if (status.shouldShow) setOpen(true);
    } catch (statusError) {
      console.error("Could not check Premium welcome eligibility", statusError);
    } finally {
      checkingRef.current = false;
    }
  }, [user, saving]);

  const close = useCallback(async () => {
    if (saving) return false;
    setError("");
    setSaving(true);
    try {
      await dismissPremiumWelcome();
      setOpen(false);
      return true;
    } catch (dismissError) {
      console.error("Could not dismiss Premium welcome", dismissError);
      setError("Your choice could not be saved. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [saving]);

  async function openFeature(href: string) {
    if (await close()) router.push(href);
  }

  useEffect(() => {
    if (authLoading || !user) {
      setOpen(false);
      return;
    }

    void checkEligibility();
    const onOnboardingCompleted = () => void checkEligibility();
    const onFocus = () => void checkEligibility();
    const onPremiumAccessChanged = () => void checkEligibility();
    const onOpenPremiumWelcome = () => {
      void getPremiumWelcomeStatus()
        .then((status) => {
          if (status.isPremium && status.onboardingCompleted) setOpen(true);
        })
        .catch((statusError: unknown) => {
          console.error("Could not open Premium welcome", statusError);
        });
    };
    window.addEventListener("batchlogg-onboarding-completed", onOnboardingCompleted);
    window.addEventListener("batchlogg-premium-access-changed", onPremiumAccessChanged);
    window.addEventListener("batchlogg-open-premium-welcome", onOpenPremiumWelcome);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("batchlogg-onboarding-completed", onOnboardingCompleted);
      window.removeEventListener("batchlogg-premium-access-changed", onPremiumAccessChanged);
      window.removeEventListener("batchlogg-open-premium-welcome", onOpenPremiumWelcome);
      window.removeEventListener("focus", onFocus);
    };
  }, [authLoading, checkEligibility, user]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    dialogRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        void close();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[125] flex items-start justify-center overflow-hidden bg-black/80 p-3 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-welcome-title"
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-green-300/20 bg-zinc-950 text-white shadow-2xl outline-none sm:max-h-[calc(100dvh-3rem)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-200">
            Your Premium welcome
          </p>
          <button
            type="button"
            aria-label="Close Premium welcome"
            disabled={saving}
            onClick={() => void close()}
            className="rounded-lg px-3 py-2 text-lg leading-none text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="p-5 sm:p-8">
          <div className="flex items-start gap-4">
            <div
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-green-300/20 bg-green-300/10 text-xl text-green-100 sm:h-14 sm:w-14"
            >
              ✦
            </div>
            <div>
              <h1 id="premium-welcome-title" className="text-2xl font-bold sm:text-3xl">
                Welcome to Premium.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                Your brewing workspace just got roomier. Here are a few newly
                unlocked ways to plan, organize, and learn from every batch.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {premiumFeatures.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                onClick={(event) => {
                  event.preventDefault();
                  if (!saving) void openFeature(feature.href);
                }}
                className="group rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-green-300/30 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300"
              >
                <span className="text-[11px] font-semibold uppercase tracking-widest text-green-200/70">
                  {feature.label}
                </span>
                <span className="mt-2 flex items-center justify-between gap-3 font-semibold text-white/90">
                  {feature.title}
                  <span aria-hidden="true" className="text-green-200">→</span>
                </span>
                <span className="mt-2 block text-sm leading-6 text-white/55">
                  {feature.description}
                </span>
              </Link>
            ))}
          </div>

          <p className="mt-5 text-xs leading-5 text-white/45">
            Premium can come from a subscription or a manual grant. Your access
            is based on your account plan.
          </p>
          {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
          <div className="mt-6 flex justify-end border-t border-white/10 pt-5">
            <button
              type="button"
              disabled={saving}
              onClick={() => void close()}
              className="rounded-lg bg-green-300 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-green-200 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Explore Premium"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
