"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { deleteAvatar, saveAvatarUrl } from "./actions";
import MenuOverlay from "../../components/MenuOverlay";
import VisibilitySwitch from "../../components/VisibilitySwitch";
import ConfirmDialog from "../../components/ConfirmDialog";
import PageHeading from "../../components/PageHeading";
import MembershipStatus from "@/app/components/MembershipStatus";
import ProfileOverview, { ProfileAchievements } from "@/app/components/ProfileOverview";

export default function AccountPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [confirmRemoveAvatar, setConfirmRemoveAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [showcaseBanner, setShowcaseBanner] = useState("");
  const [featuredRecipeId, setFeaturedRecipeId] = useState("");
  const [showcaseRecipes, setShowcaseRecipes] = useState<{ id: string; name: string }[]>([]);
  const [savingShowcase, setSavingShowcase] = useState(false);
  const [showcaseMessage, setShowcaseMessage] = useState("");
  const [profileStats, setProfileStats] = useState<any>(null);


  console.log("LOGGED IN USER ID:", user?.id);

  async function uploadAvatarClient(file: File) {
  const supabase = supabaseBrowser;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Unikt filnavn hver gang
  const fileName = `${user.id}-${Date.now()}`;

  // Last opp filen
  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false, // viktig: ikke overskriv
    });

  if (error) {
    console.log("Upload error:", error);
    return null;
  }

  // Lag public URL
  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}


  async function load() {
    const {
      data: { session },
    } = await supabaseBrowser.auth.getSession();

    if (!session) {
      router.replace("/auth/login");
      return;
    }

    const user = session.user;
    setUser(user);

    const res = await fetch("/api/profile", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const data = await res.json();

    // ⭐ VIKTIG: dette var feilen
    setProfile(data);
    setShowcaseBanner(data.profile_banner ?? "");
    setFeaturedRecipeId(data.featured_recipe_id ?? "");
    const { data: publicRecipes, error: recipesError } = await supabaseBrowser
      .from("recipes")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_public", true)
      .order("name");
    if (recipesError) {
      console.error("Could not load public recipes for profile showcase", recipesError);
      setShowcaseMessage("Public recipes could not be loaded.");
    } else {
      setShowcaseRecipes(publicRecipes ?? []);
    }

    if (data.username) {
      const statsRes = await fetch(`/api/community/profile?username=${encodeURIComponent(data.username)}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (statsRes.ok) setProfileStats((await statsRes.json()).stats ?? null);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [router]);

  useEffect(() => {
  const onFocus = () => {
    if (!showAvatarModal) {
      load();
    }
  };

  window.addEventListener("focus", onFocus);
  return () => window.removeEventListener("focus", onFocus);
}, [showAvatarModal]);

  async function toggleVisibility() {
    const newValue = !profile.is_public;

    await supabaseBrowser
      .from("profiles")
      .update({ is_public: newValue })
      .eq("id", user.id);

    setProfile((prev: any) => ({ ...prev, is_public: newValue }));
  }

  async function saveShowcase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingShowcase(true);
    setShowcaseMessage("");
    try {
      const response = await fetch("/api/community/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          profileBanner: showcaseBanner,
          featuredRecipeId: featuredRecipeId || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save profile showcase");
      setShowcaseMessage("Profile showcase saved.");
      setProfile((current: any) => ({
        ...current,
        profile_banner: showcaseBanner.trim() || null,
        featured_recipe_id: featuredRecipeId || null,
      }));
    } catch (saveError) {
      console.error("Could not save profile showcase", saveError);
      setShowcaseMessage(
        saveError instanceof Error ? saveError.message : "Could not save profile showcase."
      );
    } finally {
      setSavingShowcase(false);
    }
  }
  if (loading) {
  return (
    <main className="min-h-screen flex items-center justify-center text-white">
      <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10">
        Loading account…
      </div>
    </main>
  );
}

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 text-white">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative pt-16 sm:pt-16">
        {/* MENU BUTTON */}
        <div className="absolute top-2 sm:top-4 right-4 z-40">
          <MenuOverlay current="account" />
        </div>

        {/* BACK BUTTON */}
        <div className="absolute top-2 sm:top-4 left-4 z-40">
          <button
            onClick={() => window.history.back()}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19l-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </button>
        </div>

        <PageHeading
          title="My Account"
          subtitle="Manage your profile and visibility."
        />

        {/* AVATAR SECTION */}
        <div className="flex flex-col items-center mb-6">
          <p className="text-3xl font-bold text-center mb-4">
            {profile.username
              ? profile.username.charAt(0).toUpperCase() + profile.username.slice(1)
              : ""}
          </p>
          <img
            src={profile.avatar_url || "/default-avatar.png"}
            className="w-44 h-44 rounded-full object-cover border border-white/20"
          />
          <button
            onClick={() => setShowAvatarModal(true)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm mt-6"
          >
            Change profile picture
          </button>
        </div>

        <MembershipStatus status={profile.membership_status} />

        <div className="text-center mb-8">
          <p className="text-zinc-400 text-sm">Registered since</p>
          <p className="font-semibold">
            {new Date(user.created_at).toLocaleDateString("en-GB")}
          </p>
        </div>

        {profileStats && <ProfileOverview stats={profileStats} />}

        <form onSubmit={saveShowcase} className="mb-10 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <h2 className="font-semibold text-green-200">Profile showcase</h2>
            <p className="mt-1 text-xs text-white/55">A short banner and one public recipe appear on your public profile.</p>
          </div>
          <label className="block text-sm">Banner message
            <textarea
              value={showcaseBanner}
              onChange={(event) => setShowcaseBanner(event.target.value)}
              maxLength={280}
              rows={2}
              placeholder="A little about what you are brewing…"
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3"
            />
            <span className="mt-1 block text-right text-xs text-white/40">{showcaseBanner.length}/280</span>
          </label>
          <label className="block text-sm">Featured public recipe
            <select
              value={featuredRecipeId}
              onChange={(event) => setFeaturedRecipeId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/40 p-3"
            >
              <option value="">No featured recipe</option>
              {showcaseRecipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
              ))}
            </select>
          </label>
          {showcaseMessage && <p role="status" className="text-sm text-white/70">{showcaseMessage}</p>}
          <button
            type="submit"
            disabled={savingShowcase}
            className="rounded-lg border border-green-500/40 bg-green-800/60 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {savingShowcase ? "Saving…" : "Save showcase"}
          </button>
        </form>

        {profileStats && <ProfileAchievements stats={profileStats} />}

        {/* PUBLIC / PRIVATE SLIDER */}
        <div className="mt-10 flex items-center justify-center gap-4">
          <VisibilitySwitch
            label="Public profile"
            checked={profile.is_public}
            onChange={toggleVisibility}
            publicText="Public"
            privateText="Private"
            ariaLabel="Profile visibility"
          />
        </div>

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Batchlog
        </p>
      </div>

      {/* AVATAR MODAL */}
{showAvatarModal && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div className="bg-zinc-900 p-6 rounded-xl w-full max-w-md border border-white/10">

      <h2 className="text-xl font-bold mb-4 text-center">Change profile picture</h2>

      {/* Current avatar */}
      <div className="flex justify-center mb-4">
        <img
  src={
    pendingAvatar
      ? pendingAvatar
      : profile.avatar_url || "/default-avatar.png"
  }
  className="w-44 h-44 rounded-full object-cover border border-white/20"
/>

      </div>

      {/* Hidden file input */}
      <input
  type="file"
  accept="image/*"
  id="avatarInput"
  className="hidden"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setPendingAvatar(URL.createObjectURL(file)); // ⭐ midlertidig preview
    }
  }}
/>

      <div className="flex flex-col gap-3">

  {/* Upload + Remove (conditional layout) */}
  {profile.avatar_url ? (
    /* === Når brukeren HAR et avatar-bilde === */
    <div className="flex gap-3 w-full">

      {/* Upload new */}
      <button
        onClick={() => document.getElementById("avatarInput")?.click()}
        className="w-1/2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
      >
        Upload new picture
      </button>

      {/* Remove current */}
      <button
        onClick={() => setConfirmRemoveAvatar(true)}
        className="w-1/2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
      >
        Remove current picture
      </button>
    </div>
  ) : (
    /* === Når brukeren IKKE har avatar (default-avatar) === */
    <button
      onClick={() => document.getElementById("avatarInput")?.click()}
      className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
    >
      Upload new picture
    </button>
  )}

  <ConfirmDialog
    open={confirmRemoveAvatar}
    title="Remove profile picture?"
    message="Your profile will show the default picture instead."
    confirmLabel="Remove picture"
    onConfirm={async () => {
      try {
        await deleteAvatar();
        setProfile((prev: any) => ({ ...prev, avatar_url: null }));
        setAvatarFile(null);
        setShowAvatarModal(false);
        return true;
      } catch (error) {
        console.error("Could not remove profile picture", error);
        return false;
      }
    }}
    onCancel={() => setConfirmRemoveAvatar(false)}
  />

  {/* Save new */}
  {avatarFile && (
    <button
  onClick={async () => {
    if (!avatarFile) return;

    // 1. Last opp filen på klienten (unikt filnavn)
    const url = await uploadAvatarClient(avatarFile);
    if (!url) return;
    
    await saveAvatarUrl(url);

    // 3. Tving browseren til å hente ny versjon
    const bustedUrl = `${url}?t=${Date.now()}`;

    // 4. Oppdater UI
    setProfile((prev: any) => ({ ...prev, avatar_url: bustedUrl }));
    setAvatarFile(null);
    setPendingAvatar(null);
    setShowAvatarModal(false);
  }}
  className="px-3 py-2 bg-green-600 hover:bg-green-700 border border-green-700 rounded-lg font-semibold text-sm"
>
  Save new picture
</button>

  )}

  {/* Cancel */}
  <button
  onClick={() => {
    setAvatarFile(null);
    setPendingAvatar(null); // ⭐ nullstill
    setShowAvatarModal(false);
  }}
  className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-semibold text-sm"
>
  Cancel
</button>

</div>


    </div>
  </div>

      )}

    </main>
  );
}
