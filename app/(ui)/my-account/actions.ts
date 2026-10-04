"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { deleteUserData } from "@/lib/supabase/deleteUserData";
import { isAccentColor } from "@/lib/theme/accentColor";
import JSZip from "jszip";

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
   DOWNLOAD ALL USER DATA (ZIP-format, base64 return)
   ============================================================ */
export async function downloadUserData() {
  const { supabase, serviceRole } = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required to export account data");
  }

  const userId = user.id;

  const { data: profile, error: profileError } = await serviceRole
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileError) throw new Error(`Could not export profile: ${profileError.message}`);

  const { data: batches, error: batchesError } = await serviceRole
    .from("batches")
    .select("*")
    .eq("user_id", userId);
  if (batchesError) throw new Error(`Could not export batches: ${batchesError.message}`);

  const { data: kar, error: karError } = await serviceRole
    .from("kar")
    .select("*")
    .eq("user_id", userId);
  if (karError) throw new Error(`Could not export vessels: ${karError.message}`);

  const { data: recipes, error: recipesError } = await serviceRole
    .from("recipes")
    .select("*")
    .eq("user_id", userId);
  if (recipesError) throw new Error(`Could not export recipes: ${recipesError.message}`);

  const zip = new JSZip();

  zip.file(
    "metadata.json",
    JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        format_version: 1,
        username: profile?.username ?? "unknown",
        user_id: userId,
      },
      null,
      2
    )
  );

  zip.file("profile.json", JSON.stringify(profile ?? {}, null, 2));
  zip.file("batches.json", JSON.stringify(batches ?? [], null, 2));
  zip.file("kar.json", JSON.stringify(kar ?? [], null, 2));
  zip.file("recipes.json", JSON.stringify(recipes ?? [], null, 2));

  const zipBase64 = await zip.generateAsync({ type: "base64" });

  return zipBase64;
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
