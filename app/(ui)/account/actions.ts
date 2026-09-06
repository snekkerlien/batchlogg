"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import JSZip from "jszip";


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
  console.log("=== downloadUserData START ===");

  const { supabase, serviceRole } = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("[downloadUserData] Ingen bruker funnet");
    return null;
  }

  const userId = user.id;

  const { data: profile } = await serviceRole
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  const { data: batches } = await serviceRole
    .from("batches")
    .select("*")
    .eq("user_id", userId);

  const { data: kar } = await serviceRole
    .from("kar")
    .select("*")
    .eq("user_id", userId);

  const { data: recipes } = await serviceRole
    .from("recipes")
    .select("*")
    .eq("user_id", userId);

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

  console.log("=== downloadUserData END ===");

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
  console.log("=== deleteAccount START ===");

  const { supabase, serviceRole } = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("[deleteAccount] Ingen bruker funnet");
    return;
  }

  const userId = user.id;

  const { data: profile } = await serviceRole
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .single();

  if (profile?.avatar_url) {
  const parts = profile.avatar_url.split("/");
  const fileName = parts[parts.length - 1];

  await serviceRole.storage.from("avatars").remove([fileName]);
  console.log("[deleteAccount] Avatar slettet:", fileName);
}

  await serviceRole.from("batches").delete().eq("user_id", userId);
  await serviceRole.from("kar").delete().eq("user_id", userId);
  await serviceRole.from("recipes").delete().eq("user_id", userId);
  await serviceRole.from("profiles").delete().eq("id", userId);

  console.log("[deleteAccount] Alt innhold slettet");

  const { error: deleteError } = await serviceRole.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.log("[deleteAccount] Auth sletting feilet:", deleteError);
    return;
  }

  console.log("[deleteAccount] Auth bruker slettet");
  console.log("=== deleteAccount END ===");
}
