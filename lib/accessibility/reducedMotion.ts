export const REDUCED_MOTION_STORAGE_KEY = "batchlogg-reduced-motion";
export const REDUCED_MOTION_EVENT = "batchlogg-reduced-motion-changed";

export function getReducedMotionPreference(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const storedPreference = window.localStorage.getItem(REDUCED_MOTION_STORAGE_KEY);
    if (storedPreference === "true") return true;
    if (storedPreference === "false") return false;
  } catch (error) {
    console.error("Could not load reduced-motion preference", error);
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function setReducedMotionPreference(reducedMotion: boolean): void {
  window.localStorage.setItem(REDUCED_MOTION_STORAGE_KEY, String(reducedMotion));
  window.dispatchEvent(new Event(REDUCED_MOTION_EVENT));
}