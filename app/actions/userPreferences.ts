"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { isAccentColor } from "@/lib/theme/accentColor";
import { isUnitSystem, type UnitSystem } from "@/lib/units";
import {
  isAvailableSiteLanguage,
  type SiteLanguage,
} from "@/lib/i18n/language";

export type UserPreferences = {
  theme_accent_color: string;
  preferred_unit_system: UnitSystem;
  preferred_language?: SiteLanguage;
  use_inventory_for_batches: boolean;
  batch_reminders_enabled: boolean;
  games_enabled?: boolean;
  guides_enabled?: boolean;
  is_public: boolean;
  onboarding_completed?: boolean;
};

type BrewingPreferences = Pick<
  UserPreferences,
  | "use_inventory_for_batches"
  | "batch_reminders_enabled"
  | "games_enabled"
  | "guides_enabled"
  | "is_public"
>;

export async function saveBrewingPreferences(
  preferences: Partial<BrewingPreferences>
) {
  const entries = Object.entries(preferences);
  const allowedPreferences = [
    "use_inventory_for_batches",
    "batch_reminders_enabled",
    "games_enabled",
    "guides_enabled",
    "is_public",
  ];
  if (
    entries.length === 0 ||
    entries.some(
      ([key, value]) =>
        !allowedPreferences.includes(key) || typeof value !== "boolean"
    )
  ) {
    throw new Error("Invalid brewing preferences");
  }

  const { supabase } = await supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication required");

  const { data, error } = await supabase
    .from("profiles")
    .update(preferences)
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`Could not save brewing preferences: ${error.message}`);
  if (!data) throw new Error("Could not find the profile to save brewing preferences");
  return { saved: true };
}

export async function saveUserPreferences(preferences: UserPreferences, expectedUserId: string) {
  if (
    !isAccentColor(preferences.theme_accent_color) ||
    !isUnitSystem(preferences.preferred_unit_system) ||
    (preferences.preferred_language !== undefined &&
      !isAvailableSiteLanguage(preferences.preferred_language)) ||
    typeof preferences.use_inventory_for_batches !== "boolean" ||
    typeof preferences.batch_reminders_enabled !== "boolean" ||
    (preferences.games_enabled !== undefined &&
      typeof preferences.games_enabled !== "boolean") ||
    (preferences.guides_enabled !== undefined &&
      typeof preferences.guides_enabled !== "boolean") ||
    typeof preferences.is_public !== "boolean" ||
    (preferences.onboarding_completed !== undefined &&
      typeof preferences.onboarding_completed !== "boolean")
  ) {
    throw new Error("Invalid user preferences");
  }

  const { supabase } = await supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication required");
  if (user.id !== expectedUserId) throw new Error("The signed-in account changed. Please try again.");

  const { data, error } = await supabase
    .from("profiles")
    .update({
      theme_accent_color: preferences.theme_accent_color,
      preferred_unit_system: preferences.preferred_unit_system,
      ...(preferences.preferred_language === undefined
        ? {}
        : { preferred_language: preferences.preferred_language }),
      use_inventory_for_batches: preferences.use_inventory_for_batches,
      batch_reminders_enabled: preferences.batch_reminders_enabled,
      ...(preferences.games_enabled === undefined
        ? {}
        : { games_enabled: preferences.games_enabled }),
      ...(preferences.guides_enabled === undefined
        ? {}
        : { guides_enabled: preferences.guides_enabled }),
      is_public: preferences.is_public,
      ...(preferences.onboarding_completed === undefined
        ? {}
        : { onboarding_completed: preferences.onboarding_completed }),
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`Could not save preferences: ${error.message}`);
  if (!data) throw new Error("Could not find the profile to save preferences");

}

export async function savePreferredUnitSystem(system: UnitSystem) {
  if (!isUnitSystem(system)) throw new Error("Invalid unit system");

  const { supabase } = await supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("profiles")
    .update({ preferred_unit_system: system })
    .eq("id", user.id);

  if (error) throw new Error(`Could not save unit preference: ${error.message}`);
}

export async function savePreferredLanguage(language: SiteLanguage, expectedUserId: string) {
  if (!isAvailableSiteLanguage(language)) {
    throw new Error("This language is not available yet");
  }

  const { supabase } = await supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication required");
  if (user.id !== expectedUserId) throw new Error("The signed-in account changed. Please try again.");

  const { data, error } = await supabase
    .from("profiles")
    .update({ preferred_language: language })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`Could not save language preference: ${error.message}`);
  if (!data) throw new Error("Could not find the profile to save language preference");
}
