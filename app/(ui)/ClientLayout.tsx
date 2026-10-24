"use client";

import {
  ReactNode,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuthContext } from "../providers/AuthProvider";
import { useSupabaseSessionSync } from "../../lib/supabase/syncSession";
import { supabaseBrowser } from "../../lib/supabase/supabaseBrowser";
import ChangelogNotice from "../components/ChangelogNotice";
import FirstLoginSetup from "../components/FirstLoginSetup";
import PremiumWelcome from "../components/PremiumWelcome";
import BatchGuide from "../components/BatchGuide";
import SiteAnnouncementBanner from "../components/SiteAnnouncementBanner";
import MuteCountdownBanner from "../components/MuteCountdownBanner";
import { UnitsProvider } from "../components/Units";
import SiteStatusBanner from "../components/SiteStatusBanner";
import SiteFooter from "../components/SiteFooter";
import {
  applyAccentColor,
  DEFAULT_ACCENT_COLOR,
  isAccentColor,
} from "../../lib/theme/accentColor";
import { isDesktopApp } from "../../lib/desktopApp";
import { getErrorMessage, saveDownload } from "../../lib/desktopDownloads";
import {
  getReducedMotionPreference,
  REDUCED_MOTION_EVENT,
} from "../../lib/accessibility/reducedMotion";

function UserAccentTheme({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const [preferencesRevision, setPreferencesRevision] = useState(0);

  useEffect(() => {
    function onPreferencesSaved() {
      setPreferencesRevision((current) => current + 1);
    }
    window.addEventListener("batchlogg-preferences-saved", onPreferencesSaved);
    return () => {
      window.removeEventListener("batchlogg-preferences-saved", onPreferencesSaved);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    let current = true;

    if (!user) {
      applyAccentColor(DEFAULT_ACCENT_COLOR);
      return;
    }

    applyAccentColor(DEFAULT_ACCENT_COLOR);

    async function loadAccentColor() {
      const { data, error } = await supabaseBrowser
        .from("profiles")
        .select("theme_accent_color")
        .eq("id", user.id)
        .maybeSingle();

      if (!current) return;
      if (error) {
        console.error("Could not load account accent color", error);
        return;
      }

      if (isAccentColor(data?.theme_accent_color)) {
        applyAccentColor(data.theme_accent_color);
      }
    }

    void loadAccentColor();

    return () => {
      current = false;
    };
  }, [user?.id, preferencesRevision]);

  return <>{children}</>;
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  useSupabaseSessionSync();
  const pathname = usePathname();
  const isBannedPage = pathname === "/banned";
  const [desktopActionError, setDesktopActionError] = useState("");
  const [reducedMotion, setReducedMotion] = useState(true);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const previousPathname = useRef(pathname);
  const trackedPathname = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !session?.access_token) return;
      void fetch("/api/analytics", {
        method: "POST",
        body: JSON.stringify({ type: "sign_in" }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })
        .then((response) => {
          if (!response.ok) throw new Error(`Analytics request failed (${response.status})`);
        })
        .catch((error) => {
          if (active) console.error("Could not record sign-in analytics", error);
        });
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (trackedPathname.current === pathname) return;
    trackedPathname.current = pathname;

    let active = true;
    void (async () => {
      try {
        const {
          data: { session },
        } = await supabaseBrowser.auth.getSession();
        const response = await fetch("/api/analytics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
          body: JSON.stringify({ type: "page_view", pathname }),
        });
        if (!response.ok) {
          throw new Error(`Analytics request failed (${response.status})`);
        }
      } catch (error) {
        if (active) console.error("Could not record page-view analytics", error);
      }
    })();
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    const updateMotionPreference = () => {
      const shouldReduceMotion = getReducedMotionPreference();
      setReducedMotion(shouldReduceMotion);
      document.documentElement.dataset.reducedMotion = String(shouldReduceMotion);
    };

    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    updateMotionPreference();
    window.addEventListener(REDUCED_MOTION_EVENT, updateMotionPreference);
    motionMedia.addEventListener("change", updateMotionPreference);
    return () => {
      window.removeEventListener(REDUCED_MOTION_EVENT, updateMotionPreference);
      motionMedia.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  useLayoutEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    let frame = 0;
    let attempts = 0;

    const focusNewPage = () => {
      const mainContent = mainContentRef.current;
      if (mainContent?.dataset.routePath === pathname) {
        mainContent.focus();
        return;
      }
      if (attempts < 300) {
        attempts += 1;
        frame = window.requestAnimationFrame(focusNewPage);
      }
    };

    frame = window.requestAnimationFrame(focusNewPage);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (!isDesktopApp()) return;

    document.body.classList.add("desktop-app");
    return () => {
      document.body.classList.remove("desktop-app");
    };
  }, []);

  useEffect(() => {
    if (!isTauri()) return;

    async function handleDesktopKeydown(event: KeyboardEvent) {
      if (event.key !== "F11" || event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      event.preventDefault();
      setDesktopActionError("");
      try {
        await invoke("toggle_fullscreen");
      } catch (error) {
        console.error("Could not toggle fullscreen", error);
        setDesktopActionError(getErrorMessage(error, "Could not toggle fullscreen."));
      }
    }

    async function handleDesktopLink(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        (event.button !== 0 && !(event.type === "auxclick" && event.button === 1))
      ) return;
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      if (anchor.hasAttribute("download")) {
        if (event.type !== "click") return;
        event.preventDefault();
        setDesktopActionError("");
        try {
          const response = await fetch(anchor.href, {
            credentials: "include",
            cache: "no-store",
          });
          if (!response.ok) throw new Error(`Download failed (${response.status})`);
          await saveDownload(await response.blob(), anchor.download || "download");
        } catch (error) {
          console.error("Could not download file", error);
          setDesktopActionError(getErrorMessage(error, "Could not download the file."));
        }
        return;
      }

      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }
      if (!["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) return;
      if (
        (url.protocol === "http:" || url.protocol === "https:") &&
        url.origin === window.location.origin
      ) {
        return;
      }

      event.preventDefault();
      setDesktopActionError("");
      try {
        await openUrl(url.href);
      } catch (error) {
        console.error("Could not open external link", error);
        setDesktopActionError(getErrorMessage(error, "Could not open that link. Please try again."));
      }
    }

    document.addEventListener("click", handleDesktopLink, true);
    document.addEventListener("auxclick", handleDesktopLink, true);
    document.addEventListener("keydown", handleDesktopKeydown);
    return () => {
      document.removeEventListener("click", handleDesktopLink, true);
      document.removeEventListener("auxclick", handleDesktopLink, true);
      document.removeEventListener("keydown", handleDesktopKeydown);
    };
  }, []);

  return (
    <AuthProvider>
      <UserAccentTheme>
        <UnitsProvider>
    <a href="#main-content" className="skip-to-content">
      Skip to main content
    </a>
    {!isBannedPage && <FirstLoginSetup />}
        {!isBannedPage && <PremiumWelcome />}
        {!isBannedPage && (
          <Suspense fallback={null}>
            <BatchGuide />
          </Suspense>
        )}
        <div className="relative z-[80] mx-auto -mb-8 max-w-3xl space-y-2 px-3 pt-12 empty:hidden">
          {!isBannedPage && <SiteAnnouncementBanner />}
          {!isBannedPage && pathname !== "/" && <SiteStatusBanner />}
          {!isBannedPage && <MuteCountdownBanner />}
          {desktopActionError && (
            <p role="alert" className="rounded-lg bg-red-950/80 p-3 text-center text-sm text-red-200">
              {desktopActionError}
            </p>
          )}
        </div>
        {!isBannedPage && (
          <>
            <ChangelogNotice />
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: "#111",
                  color: "#fff",
                  border: "1px solid #333",
                },
              }}
            />
          </>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            ref={mainContentRef}
            key={pathname}
            data-route-path={pathname}
            id="main-content"
            tabIndex={-1}
            aria-label="Main content"
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: reducedMotion ? 0 : 0.25, ease: "easeOut" }}
            className="relative z-0 focus:outline-none"
          >
            {children}
          </motion.div>
        </AnimatePresence>
        {!isBannedPage && <SiteFooter />}
        </UnitsProvider>
      </UserAccentTheme>
    </AuthProvider>
  );
}
