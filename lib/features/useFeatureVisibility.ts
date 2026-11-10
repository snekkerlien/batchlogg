"use client";

import { useEffect, useState } from "react";
import type { FeatureToggleKey } from "./toggles";

type FeatureVisibility = Record<FeatureToggleKey, boolean>;

export function useFeatureVisibility(): FeatureVisibility {
  const [features, setFeatures] = useState<FeatureVisibility>({
    "business-accounts": false,
    "brewery-reviews": false,
  });

  useEffect(() => {
    let active = true;
    async function loadFeatures() {
      try {
        const response = await fetch("/api/features", { cache: "no-store" });
        if (!response.ok) throw new Error(`Could not load feature visibility (${response.status})`);
        const result = await response.json();
        if (active) {
          setFeatures({
            "business-accounts": result["business-accounts"] === true,
            "brewery-reviews": result["brewery-reviews"] === true,
          });
        }
      } catch (error) {
        console.error("Could not load feature visibility", error);
        if (active) setFeatures({ "business-accounts": false, "brewery-reviews": false });
      }
    }
    void loadFeatures();
    window.addEventListener("batchlogg-preferences-saved", loadFeatures);
    return () => {
      active = false;
      window.removeEventListener("batchlogg-preferences-saved", loadFeatures);
    };
  }, []);

  return features;
}
