"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { deleteUserData } from "@/lib/supabase/deleteUserData";
import { isAccentColor } from "@/lib/theme/accentColor";

export async function saveThemeAccentColor(color: string) {
  if (!isAccentColor(color)) {
    throw new Error("Invalid accent color");
  }

  const { supabase } = supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required to save the accent color");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ theme_accent_color: color })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not save accent color: ${error.message}`);
  }
  if (!data) {
    throw new Error("Could not find the profile to save the accent color");
  }
}

export async function saveAvatarUrl(newUrl: string) {
  const { supabase, serviceRole } = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Hent gammel avatar-url
  const { data: oldProfile } = await serviceRole
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  // Slett gammel fil hvis den finnes
  if (oldProfile?.avatar_url) {
    const parts = oldProfile.avatar_url.split("/");
    const oldFileName = parts[parts.length - 1];

    await serviceRole.storage.from("avatars").remove([oldFileName]);
    console.log("[saveAvatarUrl] Gammelt bilde slettet:", oldFileName);
  }

  // Lagre ny URL i databasen
  await serviceRole
    .from("profiles")
    .update({ avatar_url: newUrl })
    .eq("id", user.id);

  console.log("[saveAvatarUrl] Ny avatar lagret:", newUrl);

  return newUrl;
}


/* ============================================================
   DELETE AVATAR (tilbakestill til default)
   ============================================================ */
export async function deleteAvatar() {
  console.log("=== deleteAvatar START ===");

  const { supabase, serviceRole } = await supabaseServer();


  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    console.log("[deleteAvatar] Ingen bruker funnet");
    return;
  }

  // Hent nåværende avatar
  const { data: profile } = await serviceRole
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  if (profile?.avatar_url) {
  const parts = profile.avatar_url.split("/");
  const fileName = parts[parts.length - 1];

  await serviceRole.storage.from("avatars").remove([fileName]);
  console.log("[deleteAvatar] Avatar slettet:", fileName);
}

  // Sett avatar_url til null → frontend viser default-avatar.png
  await serviceRole
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  console.log("[deleteAvatar] Avatar_url satt til null");
}

/* ============================================================
   DELETE ACCOUNT (inkl. sletting av alt innhold + avatar + auth)
   ============================================================ */
export async function deleteAccount() {
  const { supabase, serviceRole } = await supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required to delete account");
  }

  await deleteUserData(serviceRole, user.id);

  const { error: deleteError } = await serviceRole.auth.admin.deleteUser(user.id);
  if (deleteError) {
    throw new Error(`Could not delete Auth user: ${deleteError.message}`);
  }
}
