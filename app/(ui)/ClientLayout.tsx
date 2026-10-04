"use client";

import { ReactNode, useEffect, useState } from "react";
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
import {
  DEFAULT_ACCENT_COLOR,
  isAccentColor,
} from "../../lib/theme/accentColor";

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

  return (
    <AuthProvider>
      <UserAccentTheme>
        <UnitsProvider>
        <FirstLoginSetup />
        <div className="relative z-[80] mx-auto -mb-8 max-w-3xl space-y-2 px-3 pt-12 empty:hidden">
          <SiteAnnouncementBanner />
          <SiteStatusBanner />
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
            key={Math.random()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-0"
          >
            {children}
          </motion.div>
        </AnimatePresence>
        </UnitsProvider>
      </UserAccentTheme>
    </AuthProvider>
  );
}
