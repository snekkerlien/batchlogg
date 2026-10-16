const DESKTOP_APP_STORAGE_KEY = "batchlogg.desktop-app";

export function isDesktopApp() {
  if (typeof window === "undefined") return false;

  const desktopEntry =
    new URLSearchParams(window.location.search).get("desktopApp") === "1";

  try {
    if (desktopEntry) {
      window.localStorage.setItem(DESKTOP_APP_STORAGE_KEY, "true");
    }

    return (
      desktopEntry ||
      window.localStorage.getItem(DESKTOP_APP_STORAGE_KEY) === "true"
    );
  } catch (error) {
    console.error("Could not read or save desktop app mode", error);
    return desktopEntry;
  }
}
