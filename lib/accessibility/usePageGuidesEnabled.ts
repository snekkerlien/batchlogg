"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

export const PAGE_GUIDES_PREFERENCE_EVENT = "batchlogg-guides-enabled-changed";

export function usePageGuidesEnabled() {
  const [guidesEnabled, setGuidesEnabled] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadPreference() {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseBrowser.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) {
        if (active) setGuidesEnabled(true);
        return;
      }

      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Could not load guide preference (${response.status})`);
      }

      const profile = await response.json();
      if (active) setGuidesEnabled(profile.guides_enabled !== false);
    }

    function handlePreferenceChange(event: Event) {
      const enabled = (event as CustomEvent<unknown>).detail;
      if (typeof enabled === "boolean") setGuidesEnabled(enabled);
    }

    loadPreference().catch((error) => {
      console.error("Failed to load page guide preference", error);
    });
    window.addEventListener(PAGE_GUIDES_PREFERENCE_EVENT, handlePreferenceChange);

    return () => {
      active = false;
      window.removeEventListener(PAGE_GUIDES_PREFERENCE_EVENT, handlePreferenceChange);
    };
  }, []);

  return guidesEnabled;
}
