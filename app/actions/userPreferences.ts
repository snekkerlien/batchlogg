"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { isAccentColor } from "@/lib/theme/accentColor";
import { isUnitSystem, type UnitSystem } from "@/lib/units";

export type UserPreferences = {
  theme_accent_color: string;
  preferred_unit_system: UnitSystem;
  use_inventory_for_batches: boolean;
  batch_reminders_enabled: boolean;
  is_public: boolean;
  onboarding_completed?: boolean;
};

export async function saveUserPreferences(preferences: UserPreferences) {
  if (
    !isAccentColor(preferences.theme_accent_color) ||
    !isUnitSystem(preferences.preferred_unit_system) ||
    typeof preferences.use_inventory_for_batches !== "boolean" ||
    typeof preferences.batch_reminders_enabled !== "boolean" ||
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

  const { data, error } = await supabase
    .from("profiles")
    .update({
      theme_accent_color: preferences.theme_accent_color,
      preferred_unit_system: preferences.preferred_unit_system,
      use_inventory_for_batches: preferences.use_inventory_for_batches,
      batch_reminders_enabled: preferences.batch_reminders_enabled,
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
