"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";
import MenuOverlay from "./MenuOverlay";
import { useRouter } from "next/navigation";
import BackButton from "@/app/components/BackButton";
import PageHeading from "@/app/components/PageHeading";
import MembershipStatus from "@/app/components/MembershipStatus";
import ReportContentButton from "@/app/components/ReportContentButton";
import RecipeFilters, { type RecipeSort } from "@/app/my-recipes/RecipeFilters";
import { membershipLabel } from "@/lib/auth/membership";
import ProfileOverview, { ProfileAchievements } from "@/app/components/ProfileOverview";
import RecipePresentation from "@/app/components/RecipePresentation";
import MemberAdminActions, { type MemberAdminDetails } from "./MemberAdminActions";
import FermentationBubbles from "@/app/components/FermentationBubbles";
import ExpandArrowButton from "@/app/components/ExpandArrowButton";
import BeerColorGlass from "@/app/components/BeerColorGlass";

function ProfilePreviewNotice() {
  return (
    <aside aria-label="Profile preview" className="mb-6 w-full rounded-lg border border-green-300/30 bg-green-300/5 p-4 text-sm">
      <p className="font-semibold text-green-200">Community profile preview</p>
      <p className="mt-1 text-white/70">This is what a signed-in member who is not your friend can see. Owner and admin access are excluded. No visibility settings have changed.</p>
      <Link href="/settings#sharing-privacy" className="mt-2 inline-flex min-h-11 items-center text-green-200 underline">Sharing and privacy settings</Link>
    </aside>
  );
}

export default function ProfileDetailPage({ params, searchParams }: {
  params: { username: string };
  searchParams?: { preview?: string };
}) {
  const router = useRouter();
  const preview = searchParams?.preview === "public";
  let routeUsername = params.username;
  try {
    routeUsername = decodeURIComponent(routeUsername);
  } catch {
    // Keep the original route value if it is not a valid encoded component.
  }

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [privateProfile, setPrivateProfile] = useState<{
    id: string;
    allow_friend_requests: boolean | null;
    username: string;
    avatar_url: string | null;
    membership_status: string | null;
    account_tier: string | null;
  } | null>(null);
  const [canViewContent, setCanViewContent] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [adminDetails, setAdminDetails] = useState<MemberAdminDetails | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequest, setFriendRequest] = useState<{
    id: string;
    status: "sent" | "received";
  } | null>(null);
  const [friendRequestBusy, setFriendRequestBusy] = useState(false);
  const [friendRequestError, setFriendRequestError] = useState("");
  const [kar, setKar] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [publicRecipeType, setPublicRecipeType] = useState("All");
  const [publicRecipeSearch, setPublicRecipeSearch] = useState("");
  const [publicRecipeSort, setPublicRecipeSort] = useState<RecipeSort>("newest");
  const [profileStats, setProfileStats] = useState<{
    totalBatches: number;
    totalRecipes: number;
    publicRecipes: number;
    forumPosts: number;
    totalRatings: number;
  } | null>(null);


  
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    setProfile(null);
    setPrivateProfile(null);
    async function load() {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseBrowser.auth.getSession();

      if (!active) return;
      if (sessionError) throw sessionError;
      if (!session) {
        router.replace(`/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      const response = await fetch(
        `/api/community/profile?username=${encodeURIComponent(routeUsername)}${preview ? "&preview=public" : ""}`,
        { cache: "no-store", credentials: "include" }
      );
      const profileResult = await response.json();
      if (!active) return;
      if (response.status === 403 && profileResult.private && profileResult.profile) {
        setPrivateProfile(profileResult.profile);
        setFriendRequest(profileResult.friendRequest ?? null);
        setLoading(false);
        return;
      }
      if (response.status === 404) {
        setProfile(null);
        setLoading(false);
        return;
      }
      if (!response.ok || !profileResult.profile) {
        throw new Error(profileResult.error || "Could not load profile");
      }

      const profileData = profileResult.profile;
      setProfile(profileData);
      setCanViewContent(profileResult.canViewContent);
      setCanManageUsers(profileResult.canManageUsers === true);
      setAdminDetails(profileResult.adminDetails ?? null);
      setProfileStats(profileResult.stats ?? null);
      setIsOwner(!preview && session.user.id === profileData.id);
      setIsFriend(profileResult.isFriend);
      setFriendRequest(profileResult.friendRequest);

      const userId = profileData.id;
      const isOwner = !preview && session.user.id === userId;

      if (!profileResult.canViewContent) {
        setKar([]);
        setRecipes([]);
        setLoading(false);
        return;
      }

      let vesselQuery = supabaseBrowser
        .from("kar")
        .select("*")
        .eq("user_id", userId)
        .order("nummer");
      if (!isOwner) vesselQuery = vesselQuery.eq("is_public", true);
      const { data: karRaw, error: vesselsError } = await vesselQuery;

      if (!active) return;
      if (vesselsError) throw vesselsError;
      const vesselIds = (karRaw ?? []).map(vessel => vessel.id);
      let batchQuery = supabaseBrowser
        .from("batches")
        .select("*")
        .eq("user_id", userId);
      if (!isOwner) batchQuery = batchQuery.in("aktivt_kar", vesselIds);
      const { data: batchesRaw, error: batchesError } = !isOwner && vesselIds.length === 0
        ? { data: [], error: null }
        : await batchQuery;
      if (!active) return;
      if (batchesError) throw batchesError;

      const visibleKar = isOwner
        ? karRaw ?? []
        : (karRaw ?? []).filter((k: any) => k.is_public === true);

      const karProcessed = visibleKar.map((k: any, index: number) => {
        const active = batchesRaw
  ?.filter((b: any) =>
    b.aktivt_kar === k.id && b.status === "Aktiv"
  )
  .sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  )[0];

const conditioning = batchesRaw
  ?.filter((b: any) =>
    b.aktivt_kar === k.id && b.status === "Conditioning"
  )
  .sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  )[0];

const secondary = batchesRaw
  ?.filter((b: any) =>
    b.aktivt_kar === k.id && ["Sekundær", "secondary"].includes(b.status)
  )
  .sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  )[0];

        let status = "Empty";
        if (active) status = "Primary";
        else if (secondary) status = "Secondary";
        else if (conditioning) status = "Conditioning";

        return {
          id: k.id,
          nummer: index + 1,
          created_at: k.created_at,
          status,
          batchName: active?.name ?? secondary?.name ?? conditioning?.name ?? null,
        };
      });

      setKar(karProcessed);

      const { data: recipesRaw, error: recipesError } = await supabaseBrowser
        .from("recipes")
        .select("*")
        .eq("user_id", userId)
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (recipesError) throw recipesError;

      setRecipes(recipesRaw ?? []);
      setLoading(false);
    }

    load().catch(error => {
      console.error("Could not load member profile", error);
      if (!active) return;
      setLoadError("This profile could not be loaded. Please reload and try again.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [routeUsername, router, preview]);

  if (loadError) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-white">
        <div className="rounded-xl border border-white/10 bg-black/60 p-6">
          <p role="alert">{loadError}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-3 min-h-11 rounded-lg border border-white/20 px-4 py-2">Reload profile</button>
          <Link href="/settings#sharing-privacy" className="ml-4 inline-flex min-h-11 items-center underline">Sharing and privacy</Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10">
          Loading…
        </div>
      </main>
    );
  }

  if (!profile && privateProfile) {
    const name =
      privateProfile.username.charAt(0).toUpperCase() + privateProfile.username.slice(1);
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-white">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-black/60 px-8 py-8 text-center backdrop-blur-md">
          {preview && <ProfilePreviewNotice />}
          <Image
            src={
              privateProfile.avatar_url && privateProfile.avatar_url.length > 5
                ? privateProfile.avatar_url
                : "/default-avatar.png"
            }
            alt=""
            width={80}
            height={80}
            sizes="80px"
            unoptimized
            className="h-20 w-20 rounded-full border border-white/20 object-cover"
          />
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="          text-sm font-semibold text-white/70">
            {membershipLabel(privateProfile.membership_status)}
          </p>
          <p className="text-sm font-semibold text-green-200">
            {privateProfile.account_tier === "premium" ? "Premium" : "Free"} tier
          </p>
          {privateProfile.allow_friend_requests && (
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={!friendRequest ? sendFriendRequest : undefined}
                disabled={preview || !!friendRequest || friendRequestBusy}
                className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:cursor-default disabled:opacity-80"
              >
                {friendRequest?.status === "sent"
                  ? "Request sent"
                  : friendRequest?.status === "received"
                    ? "Request received"
                    : friendRequestBusy
                      ? "Sending…"
                      : "Add friend"}
              </button>
              {friendRequest?.status === "sent" && (
                <button
                  type="button"
                  onClick={cancelFriendRequest}
                  disabled={friendRequestBusy}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                >
                  {friendRequestBusy ? "Canceling…" : "Cancel request"}
                </button>
              )}
            </div>
          )}
          {friendRequestError && (
            <p role="alert" className="text-sm text-red-400">
              {friendRequestError}
            </p>
          )}
          <p className="mt-2 text-white/80">This profile is private.</p>
          <p className="max-w-xs text-sm text-white/50">
            {name} has chosen to keep their profile private. Only friends can view it.
          </p>
          <div className="mt-4">
            <BackButton />
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10">
          <h1 className="text-2xl font-bold text-green-300">Profile not found</h1>
        </div>
      </main>
    );
  }

  function toggle(id: string) {
    setExpanded(expanded === id ? null : id);
  }

  const visibleRecipes = recipes
    .filter((recipe) =>
      publicRecipeType === "All" ||
      recipe.type?.toLowerCase() === publicRecipeType.toLowerCase()
    )
    .filter((recipe) =>
      !publicRecipeSearch.trim() ||
      String(recipe.name ?? "").toLowerCase().includes(publicRecipeSearch.trim().toLowerCase())
    )
    .sort((a, b) => {
      if (publicRecipeSort === "name") {
        return String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, {
          sensitivity: "base",
        });
      }
      const direction = publicRecipeSort === "newest" ? -1 : 1;
      return direction * (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

  async function sendFriendRequest() {
    const target = profile ?? privateProfile;
    if (!target || friendRequestBusy) return;
    setFriendRequestBusy(true);
    setFriendRequestError("");

    try {
      const response = await fetch("/api/community/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "request",         userId: target.id }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not send friend request");
      }
      setFriendRequest({ id: result.id, status: "sent" });
    } catch (requestError) {
      console.error("Could not send profile friend request", requestError);
      setFriendRequestError(
        requestError instanceof Error
          ? requestError.message
          : "Could not send friend request."
      );
    } finally {
      setFriendRequestBusy(false);
    }
  }

  async function cancelFriendRequest() {
    if (!friendRequest || friendRequest.status !== "sent" || friendRequestBusy) return;
    setFriendRequestBusy(true);
    setFriendRequestError("");

    try {
      const response = await fetch("/api/community/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "cancel", requestId: friendRequest.id }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not cancel friend request");
      }
      setFriendRequest(null);
    } catch (requestError) {
      console.error("Could not cancel profile friend request", requestError);
      setFriendRequestError(
        requestError instanceof Error
          ? requestError.message
          : "Could not cancel friend request."
      );
    } finally {
      setFriendRequestBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white flex justify-center">
      <div className="bg-black/60 backdrop-blur-md p-8 rounded-xl w-full max-w-3xl border border-white/10">

        {/* TOP BAR */}
        <div className="flex items-center justify-between mb-6">
          <BackButton />

          <MenuOverlay />
        </div>

{preview ? <ProfilePreviewNotice /> : isOwner && (
  <div className="mb-6 flex flex-wrap justify-center gap-4 text-sm">
    <a href={`/members/${encodeURIComponent(profile.username)}?preview=public`} className="inline-flex min-h-11 items-center text-green-200 underline">Preview my community profile</a>
    <Link href="/settings#sharing-privacy" className="inline-flex min-h-11 items-center text-white/70 underline">Sharing and privacy</Link>
  </div>
)}

{canManageUsers && adminDetails && (
  <MemberAdminActions
    userId={profile.id}
    username={profile.username}
    details={adminDetails}
    membershipStatus={profile.membership_status}
  />
)}

       {/* PROFILE AVATAR */}
<div className="w-full flex justify-center mb-6">
  <Image
    src={
      profile.avatar_url && profile.avatar_url.length > 5
        ? profile.avatar_url
        : "/default-avatar.png"
    }
    alt=""
    width={176}
    height={176}
    sizes="176px"
    unoptimized
    className="w-44 h-44 rounded-full object-cover object-center border border-white/20"
  />
</div>

<PageHeading
  title={profile.username.charAt(0).toUpperCase() + profile.username.slice(1)}
  subtitle={
    canViewContent
      ? profile.is_public && profile.profile_banner
        ? <span className="whitespace-pre-wrap break-words italic">“{profile.profile_banner.trim()}”</span>
        : ""
      : "This is a private profile. You can see their name and profile picture because you’re friends."
  }
/>

<MembershipStatus
  status={profile.membership_status}
  tier={profile.account_tier}
/>

{!isOwner && !preview && (
  <div className="mb-6 flex justify-center">
    <ReportContentButton
      contentType="profile"
      contentId={profile.id}
      contextUrl={`/members/${encodeURIComponent(profile.username)}`}
    />
  </div>
)}

{!isOwner && !preview && (
  <div className="mb-8 flex flex-wrap justify-center gap-3">
    {(isFriend || friendRequest || profile.allow_friend_requests) && (
      <button
        type="button"
        onClick={!isFriend && !friendRequest ? sendFriendRequest : undefined}
        disabled={isFriend || !!friendRequest || friendRequestBusy || !profile.is_public}
        className={`rounded-lg border px-4 py-2 text-sm font-semibold disabled:cursor-default disabled:opacity-80 ${
          isFriend || friendRequest
            ? "border-white/20 bg-white/10 text-white/80"
            : "border-white/20 bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        {isFriend
          ? "Friends"
          : friendRequest?.status === "sent"
            ? "Request sent"
            : friendRequest?.status === "received"
              ? "Request received"
              : friendRequestBusy
                ? "Sending…"
                : "Add friend"}
      </button>
    )}
    {friendRequest?.status === "sent" && (
      <button
        type="button"
        onClick={cancelFriendRequest}
        disabled={friendRequestBusy}
        className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
      >
        {friendRequestBusy ? "Canceling…" : "Cancel request"}
      </button>
    )}
    {isFriend && (
      <Link
        href={`/community/messages?peer_id=${encodeURIComponent(profile.id)}`}
        className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
      >
        Send message
      </Link>
    )}
    {friendRequestError && (
      <p role="alert" className="w-full text-center text-sm text-red-400">
        {friendRequestError}
      </p>
    )}
  </div>
)}

{canViewContent ? (
  <>
{profileStats && (
  <ProfileOverview stats={profileStats} />
)}
{canViewContent && profile.is_public && profile.has_premium_access && profile.featured_recipe_id && (() => {
  const featuredRecipe = recipes.find((recipe) => recipe.id === profile.featured_recipe_id);
  if (!featuredRecipe) return null;
  return (
    <Link
  href={`/members/${encodeURIComponent(profile.username)}/recipes/${featuredRecipe.id}`}
  className="mb-8 block rounded-xl border border-green-300/20 bg-green-300/5 p-5 transition hover:bg-green-300/10"
>
  <p className="text-xs font-semibold uppercase tracking-wider text-green-200">Featured recipe</p>
  <h2 className="mt-2 text-xl font-semibold">{featuredRecipe.name}</h2>
  <p className="mt-1 text-sm text-white/55">{featuredRecipe.type}</p>
</Link>

  );
})()}
{/* VESSELS */}
        <h2 className="text-2xl font-semibold mb-4 text-center text-green-300">
          Vessels
        </h2>

        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {kar.length > 0 ? (
            kar.map((k, index) => (
              <Link
                key={k.id}
                href={`/members/${encodeURIComponent(profile.username)}/${k.id}`}
                className="relative border border-white/10 rounded-xl p-4 bg-white/5 w-32 h-32 flex flex-col items-center justify-center transition overflow-hidden hover:bg-white/10"
              >
                {(k.status === "Primary" || k.status === "Secondary") && (
                  <FermentationBubbles count={12} />
                )}

                <span
                  className="relative z-10 text-lg font-bold text-green-300 text-center leading-tight line-clamp-2"
                >
                  {k.batchName ?? `Vessel`}
                </span>

                <span className="relative z-10 text-zinc-400 font-semibold mt-2">
                  {k.status}
                </span>
              </Link>
            ))
          ) : (
            <p className="opacity-60 text-center">No vessels found.</p>
          )}
        </div>

        {/* RECIPES */}
<h2 className="text-2xl font-semibold mb-4 text-center text-green-300">
  Public recipes
</h2>

<RecipeFilters
  type={publicRecipeType}
  onTypeChange={setPublicRecipeType}
  search={publicRecipeSearch}
  onSearchChange={setPublicRecipeSearch}
  sort={publicRecipeSort}
  onSortChange={setPublicRecipeSort}
/>

<div className="space-y-4">
  {visibleRecipes.length > 0 ? (
    visibleRecipes.map((r) => (
      <div
        key={r.id}
        className="bg-white/10 border border-white/20 rounded-xl p-4"
      >
        {/* Header */}
        <div className="flex w-full items-center justify-between gap-3 text-left">
          <span className="min-w-0 text-xl font-bold text-green-300">
            {r.name.charAt(0).toUpperCase() + r.name.slice(1)}
          </span>
          <ExpandArrowButton
            expanded={expanded === r.id}
            label={r.name || "recipe"}
            controls={`member-recipe-${r.id}`}
            onClick={() => toggle(r.id)}
          />
        </div>
        {expanded !== r.id && (
          <div
            aria-label={`${r.name} recipe summary`}
            className="mt-3 grid grid-cols-3 gap-x-2 gap-y-1.5 text-sm sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1"
          >
            {([
              ["OG", r.og, 3],
              ["FG", r.fg, 3],
              ["ABV", r.abv, 1],
            ] as const).map(([label, value, decimals]) => {
              const numeric = value == null || value === "" ? null : Number(value);
              const display =
                numeric !== null && Number.isFinite(numeric)
                  ? numeric.toFixed(decimals)
                  : "—";
              return (
                <span
                  key={label}
                  className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap rounded-md border border-white/10 bg-black/20 px-2 py-1 sm:gap-1.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0"
                >
                  <strong className="text-[10px] text-white/55 sm:text-sm sm:text-white">
                    {label}:
                  </strong>
                  <span className="text-xs sm:text-sm">
                    {display}{label === "ABV" ? "%" : ""}
                  </span>
                </span>
              );
            })}
            {(r.type === "Beer" || r.type === "Braggot") && (
              <>
                {([
                  ["IBU", r.ibu, 0],
                  ["EBC", r.ebc, 0],
                ] as const).map(([label, value, decimals]) => {
                  const numeric = value == null || value === "" ? null : Number(value);
                  const display =
                    numeric !== null && Number.isFinite(numeric)
                      ? numeric.toFixed(decimals)
                      : "—";
                  return (
                    <span
                      key={label}
                      className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap rounded-md border border-white/10 bg-black/20 px-2 py-1 sm:gap-1.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0"
                    >
                      <strong className="text-[10px] text-white/55 sm:text-sm sm:text-white">
                        {label}:
                      </strong>
                      <span className="inline-flex items-center gap-0.5 text-xs sm:gap-1 sm:text-sm">
                        {display}
                        {label === "EBC" && numeric !== null && Number.isFinite(numeric) && (
                          <BeerColorGlass ebc={numeric} compact />
                        )}
                      </span>
                    </span>
                  );
                })}
              </>
            )}
          </div>
        )}
        {/* Slide-down content */}
        <div
          id={`member-recipe-${r.id}`}
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            expanded === r.id ? "max-h-[6000px] mt-4" : "max-h-0"
          }`}
        >
          <div className="space-y-4 opacity-90 text-sm">
            <RecipePresentation recipe={r} />

            {/* Link to full recipe */}
            <div className="flex justify-end pt-4">
              <Link
                href={`/members/${encodeURIComponent(profile.username)}/recipes/${r.id}`}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold"
              >
                Open full recipe →
              </Link>
            </div>
            {!isOwner && !preview && (
              <div className="flex justify-end">
                <ReportContentButton
                  contentType="recipe"
                  contentId={r.id}
                  contextUrl={`/members/${encodeURIComponent(profile.username)}/recipes/${r.id}`}
                />
              </div>
            )}

          </div>
        </div>
        <p className="mt-4 border-t border-white/10 pt-3 text-xs text-white/55">
          Created{" "}
          {r.created_at
            ? new Date(r.created_at).toLocaleDateString("en-GB")
            : "date unavailable"}
          {" · "}
          {r.copyright_free === true
            ? `Marked copyright-free by ${profile.username}`
            : `Copyright © ${r.created_at ? new Date(r.created_at).getFullYear() : new Date().getFullYear()} ${profile.username}. All rights reserved.`}
        </p>
      </div>
    ))
  ) : (
    <p className="opacity-60 text-center">No public recipes.</p>
  )}
</div>

{profileStats && (
  <ProfileAchievements
    stats={profileStats}
    showProgress={isOwner}
  />
)}


  </>
) : (
  <p className="my-10 text-center text-sm text-white/60">
    Their vessels and recipes are private.
  </p>
)}

      </div>
    </main>
  );
}
