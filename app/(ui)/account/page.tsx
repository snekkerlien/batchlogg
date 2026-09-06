"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { deleteAccount, downloadUserData, deleteAvatar } from "./actions";
import MenuOverlay from "../../components/MenuOverlay";
import { saveAvatarUrl } from "./actions";

export default function AccountPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const [showDownloadSpinner, setShowDownloadSpinner] = useState(false);
  const [showDownloadToast, setShowDownloadToast] = useState(false);

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);


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


  async function changePassword() {
    setPasswordError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields must be filled out");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password does not match confirmation");
      return;
    }

    const { error: loginError } = await supabaseBrowser.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (loginError) {
      setPasswordError("Old password is incorrect");
      return;
    }

    const { error: updateError } = await supabaseBrowser.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setPasswordError("Could not change password");
      return;
    }

    setShowPasswordChangeModal(false);
    alert("Password changed!");
  }

  async function handleDeleteAccount() {
    setDeleteError("");

    if (!deletePassword) {
      setDeleteError("You must enter your password");
      return;
    }

    const { error: loginError } = await supabaseBrowser.auth.signInWithPassword({
      email: user.email,
      password: deletePassword,
    });

    if (loginError) {
      setDeleteError("Incorrect password");
      return;
    }

    await deleteAccount();
    router.replace("/auth/login");
  }

  async function handleDownload() {
    setShowDownloadSpinner(true);

    const base64 = await downloadUserData();
    setShowDownloadSpinner(false);

    if (!base64) return;

    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/zip" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${profile.username} profile data - Batchlog.zip`;
    a.click();

    URL.revokeObjectURL(url);

    setShowDownloadToast(true);
    setTimeout(() => setShowDownloadToast(false), 3000);
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
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10 relative pt-16 sm:pt-0">
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

        <h1 className="text-3xl font-bold mb-6 text-center mt-6">My Account</h1>

        {/* PUBLIC / PRIVATE SLIDER */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <p className="text-sm opacity-80">Public profile</p>

          <div
            onClick={toggleVisibility}
            className={`w-14 h-7 rounded-full cursor-pointer transition relative ${
              profile.is_public ? "bg-green-500" : "bg-zinc-600"
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition ${
                profile.is_public ? "translate-x-7" : ""
              }`}
            ></div>
          </div>
        </div>


        {/* AVATAR SECTION */}
<div className="flex flex-col items-center mb-10">
  {/* Avatar preview */}
  <img
    src={profile.avatar_url || "/default-avatar.png"}
    className="w-28 h-28 rounded-full object-cover border border-white/20"
  />
  {/* Change button */}
  <button
    onClick={() => setShowAvatarModal(true)}
    className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm mt-6"
  >
    Change profile picture
  </button>
</div>


        

        {/* INFO */}
        <div className="space-y-4 mb-10 text-center">
          <div>
            <p className="text-zinc-400 text-sm">Registered since</p>
            <p className="font-semibold">
              {new Date(user.created_at).toLocaleDateString("en-GB")}
            </p>
          </div>
        </div>

        {/* PASSWORD BUTTON */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setShowPasswordChangeModal(true)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
          >
            Change password
          </button>
        </div>

        {/* DOWNLOAD DATA BUTTON */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handleDownload}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold text-sm"
          >
            Download my data
          </button>
        </div>

        {/* DELETE ACCOUNT BUTTON */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 border border-red-700 rounded-lg font-semibold text-sm"
          >
            Delete my account
          </button>
        </div>

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Batchlog
        </p>
      </div>

      {/* PASSWORD MODAL */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Change password</h2>

            <input
              type="password"
              placeholder="Old password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700 mb-3"
            />

            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700 mb-3"
            />

            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700"
            />

            {passwordError && (
              <p className="text-red-500 mt-2">{passwordError}</p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPasswordChangeModal(false)}
                className="px-3 py-2 bg-zinc-700 rounded"
              >
                Cancel
              </button>

              <button
                onClick={changePassword}
                className="px-3 py-2 bg-green-600 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 p-6 rounded-xl w-full max-w-md border border-white/10">
            <h2 className="text-xl font-bold mb-4 text-red-400">
              Delete account
            </h2>

            <p className="text-sm text-zinc-300 mb-4">
              This action is permanent. All your batches, recipes, vessels and
              your profile will be deleted forever.
            </p>

            <p className="text-sm text-zinc-400 mb-2">
              To confirm, enter your password:
            </p>

            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Password"
              className="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700"
            />

            {deleteError && (
              <p className="text-red-500 mt-2">{deleteError}</p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-2 bg-zinc-700 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteAccount}
                className="px-3 py-2 bg-red-600 rounded"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOWNLOAD SPINNER */}
      {showDownloadSpinner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="mt-4 text-white opacity-80">Generating ZIP…</p>
          </div>
        </div>
      )}

      {/* DOWNLOAD TOAST */}
      {showDownloadToast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50">
          Your data export is ready!
        </div>
      )}
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
  className="w-28 h-28 rounded-full object-cover border border-white/20"
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
        onClick={async () => {
          await deleteAvatar();
          setProfile((prev: any) => ({ ...prev, avatar_url: null }));
          setAvatarFile(null);
          setShowAvatarModal(false);
        }}
        className="w-1/2 px-3 py-2 bg-red-600 hover:bg-red-700 border border-red-700 rounded-lg font-semibold text-sm"
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
