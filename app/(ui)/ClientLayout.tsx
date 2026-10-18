"use client";

import { ReactNode, useEffect, useState } from "react";
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
import SiteAnnouncementBanner from "../components/SiteAnnouncementBanner";
import { UnitsProvider } from "../components/Units";
import SiteStatusBanner from "../components/SiteStatusBanner";
import SiteFooter from "../components/SiteFooter";
import {
  DEFAULT_ACCENT_COLOR,
  isAccentColor,
} from "../../lib/theme/accentColor";
import { isDesktopApp } from "../../lib/desktopApp";
import { getErrorMessage, saveDownload } from "../../lib/desktopDownloads";

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
      root.style.setProperty("--user-accent", DEFAULT_ACCENT_COLOR);
      return;
    }

    root.style.setProperty("--user-accent", DEFAULT_ACCENT_COLOR);

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
        root.style.setProperty("--user-accent", data.theme_accent_color);
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
  const [desktopActionError, setDesktopActionError] = useState("");

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
      if (event.defaultPrevented || event.button !== 0) return;
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      if (anchor.hasAttribute("download")) {
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

    document.addEventListener("click", handleDesktopLink);
    document.addEventListener("keydown", handleDesktopKeydown);
    return () => {
      document.removeEventListener("click", handleDesktopLink);
      document.removeEventListener("keydown", handleDesktopKeydown);
    };
  }, []);

  return (
    <AuthProvider>
      <UserAccentTheme>
        <UnitsProvider>
        <FirstLoginSetup />
        <div className="relative z-[80] mx-auto -mb-8 max-w-3xl space-y-2 px-3 pt-12 empty:hidden">
          <SiteAnnouncementBanner />
          {pathname !== "/" && <SiteStatusBanner />}
          {desktopActionError && (
            <p role="alert" className="rounded-lg bg-red-950/80 p-3 text-center text-sm text-red-200">
              {desktopActionError}
            </p>
          )}
        </div>
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

        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-0"
          >
            {children}
          </motion.div>
        </AnimatePresence>
        <SiteFooter />
        </UnitsProvider>
      </UserAccentTheme>
    </AuthProvider>
  );
}
