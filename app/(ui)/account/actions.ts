"use server";

import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import JSZip from "jszip";

/* ============================================================
   UPLOAD / CHANGE AVATAR (inkl. sletting av gammelt bilde)
   ============================================================ */
export async function uploadAvatar(formData: FormData) {
  console.log("=== uploadAvatar START ===");

  const file = formData.get("file") as File;
  if (!file) {
    console.log("[uploadAvatar] Ingen fil mottatt");
    return;
  }

  // Hent supabase-klient og bruker
  const { supabase } = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    console.log("[uploadAvatar] Ingen bruker funnet");
    return;
  }

  // Slett gammelt bilde hvis det finnes
  const { data: oldProfile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  if (oldProfile?.avatar_url) {
    const parts = oldProfile.avatar_url.split("/");
    const oldFileName = parts[parts.length - 1];

    await supabase.storage.from("avatars").remove([oldFileName]);
    console.log("[uploadAvatar] Gammelt bilde slettet:", oldFileName);
  }

  // Last opp nytt bilde med riktig MIME-type
  const fileName = `${user.id}-${Date.now()}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, {
      contentType: file.type, // ← kritisk!
      upsert: true,
    });

  if (uploadError) {
    console.log("[uploadAvatar] Upload error:", uploadError);
    return;
  }

  // Hent public URL
  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(uploadData.path);

  const avatarUrl = urlData.publicUrl.trim();

  // Oppdater profil
  await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  console.log("[uploadAvatar] Avatar oppdatert:", avatarUrl);

  return avatarUrl;
}

/* ============================================================
   DOWNLOAD ALL USER DATA (ZIP-format, base64 return)
   ============================================================ */
export async function downloadUserData() {
  console.log("=== downloadUserData START ===");

  const { supabase } = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("[downloadUserData] Ingen bruker funnet");
    return null;
  }

  const userId = user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  const { data: batches } = await supabase
    .from("batches")
    .select("*")
    .eq("user_id", userId);

  const { data: kar } = await supabase
    .from("kar")
    .select("*")
    .eq("user_id", userId);

  const { data: recipes } = await supabase
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

  const { data: profile } = await supabase
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
