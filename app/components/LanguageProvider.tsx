"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useAuthContext } from "@/app/providers/AuthProvider";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { savePreferredLanguage } from "@/app/actions/userPreferences";
import {
  isAvailableSiteLanguage,
  getPageLanguage,
  languageStorageKey,
  type SiteLanguage,
} from "@/lib/i18n/language";

type LanguageContextValue = {
  language: SiteLanguage;
  setLanguage: (language: SiteLanguage) => Promise<void>;
  applyLanguage: (language: SiteLanguage) => void;
  saveError: string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuthContext();
  const pathname = usePathname();
  const userId = user?.id;
  const activeUserId = useRef(userId);
  activeUserId.current = userId;
  const revision = useRef(0);
  const [language, setLanguageState] = useState<SiteLanguage>("en");
  const currentLanguage = useRef<SiteLanguage>("en");
  const [saveError, setSaveError] = useState("");

  const applyLanguage = useCallback((next: SiteLanguage) => {
    if (!isAvailableSiteLanguage(next)) {
      throw new Error("This language is not available yet");
    }
    revision.current += 1;
    currentLanguage.current = next;
    setLanguageState(next);
    window.localStorage.setItem(languageStorageKey(activeUserId.current), next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = getPageLanguage(language, pathname);
  }, [language, pathname]);

  useEffect(() => {
    if (authLoading) return;
    const stored = window.localStorage.getItem(languageStorageKey(userId));
    applyLanguage(isAvailableSiteLanguage(stored) ? stored : "en");
    setSaveError("");

    function onStorage(event: StorageEvent) {
      if (activeUserId.current !== userId || event.key !== languageStorageKey(userId) || !isAvailableSiteLanguage(event.newValue)) return;
      revision.current += 1;
      currentLanguage.current = event.newValue;
      setLanguageState(event.newValue);
      setSaveError("");
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [applyLanguage, authLoading, userId]);

  useEffect(() => {
    let active = true;
    if (authLoading || !userId) return;
    let requestId = 0;

    function loadLanguage() {
      const currentRequest = ++requestId;
      const loadRevision = revision.current;
      const isCurrent = () =>
        active && activeUserId.current === userId &&
        currentRequest === requestId && loadRevision === revision.current;

      supabaseBrowser
        .from("profiles")
        .select("preferred_language")
        .eq("id", userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!isCurrent()) return;
          if (error) {
            console.error("Could not load preferred language", error);
            setSaveError("Could not load your saved language preference.");
            return;
          }
          setSaveError("");
          if (isAvailableSiteLanguage(data?.preferred_language)) {
            applyLanguage(data.preferred_language);
          } else if (!data) {
            applyLanguage("en");
          }
        }, (error: unknown) => {
          if (!isCurrent()) return;
          console.error("Could not load preferred language", error);
          setSaveError("Could not load your saved language preference.");
        });
    }

    loadLanguage();
    window.addEventListener("batchlogg-profile-created", loadLanguage);
    window.addEventListener("batchlogg-profile-restored", loadLanguage);

    return () => {
      active = false;
      window.removeEventListener("batchlogg-profile-created", loadLanguage);
      window.removeEventListener("batchlogg-profile-restored", loadLanguage);
    };
  }, [applyLanguage, authLoading, userId]);

  const setLanguage = useCallback(async (next: SiteLanguage) => {
    if (!isAvailableSiteLanguage(next)) {
      throw new Error("This language is not available yet");
    }

    if (authLoading) throw new Error("Account status is still loading. Please try again.");
    const previous = currentLanguage.current;
    setSaveError("");
    if (!userId) {
      applyLanguage(next);
      return;
    }
    revision.current += 1;
    const saveRevision = revision.current;
    currentLanguage.current = next;
    setLanguageState(next);

    try {
      await savePreferredLanguage(next, userId);
      if (activeUserId.current === userId && revision.current === saveRevision) {
        applyLanguage(next);
      }
    } catch (error) {
      console.error("Could not save preferred language", error);
      if (activeUserId.current === userId && revision.current === saveRevision) {
        applyLanguage(previous);
        setSaveError("Your language preference could not be saved.");
      }
      throw error;
    }
  }, [applyLanguage, authLoading, userId]);

  const value = useMemo(
    () => ({ language, setLanguage, applyLanguage, saveError }),
    [language, setLanguage, applyLanguage, saveError]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used within LanguageProvider");
  return value;
}
