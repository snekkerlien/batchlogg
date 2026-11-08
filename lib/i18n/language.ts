export const NORWEGIAN_BOKMAL_READY = true;

export const SITE_LANGUAGES = [
  { code: "en", labelKey: "language.english", flag: "gb", available: true },
  { code: "nb", labelKey: "language.norwegianBokmal", flag: "no", available: NORWEGIAN_BOKMAL_READY },
] as const;

export type SiteLanguage = (typeof SITE_LANGUAGES)[number]["code"];

export function isSiteLanguage(value: unknown): value is SiteLanguage {
  return SITE_LANGUAGES.some((language) => language.code === value);
}

export function isAvailableSiteLanguage(value: unknown): value is SiteLanguage {
  return SITE_LANGUAGES.some((language) => language.code === value && language.available);
}

export function languageStorageKey(userId?: string): string {
  return userId ? `batchlog-language:${userId}` : "batchlog-language";
}

export function getPageLanguage(language: SiteLanguage, pathname: string): SiteLanguage {
  return pathname === "/admin" || pathname.startsWith("/admin/") ? "en" : language;
}

export const PRESERVED_TERMS = [
  "Batchlogg",
  "ABV",
  "OG",
  "FG",
  "SG",
  "IBU",
  "EBC",
  "Batch",
] as const;
