"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";
import MenuOverlay from "./MenuOverlay";
import { useRouter } from "next/navigation";
import PageHeading from "@/app/components/PageHeading";
import type { Fruit, Malt, Hop, Ingredient } from "@/app/types/batchTypes";
import MembershipStatus from "@/app/components/MembershipStatus";
import ReportContentButton from "@/app/components/ReportContentButton";
import RecipeFilters, { type RecipeSort } from "@/app/my-recipes/RecipeFilters";
import { membershipLabel } from "@/lib/auth/membership";
import ProfileOverview, { ProfileAchievements } from "@/app/components/ProfileOverview";
import { Qty } from "@/app/components/Units";


export default function ProfileDetailPage({ params }: { params: { username: string } }) {
  const router = useRouter();
  let routeUsername = params.username;
  try {
    routeUsername = decodeURIComponent(routeUsername);
  } catch {
    // Keep the original route value if it is not a valid encoded component.
  }

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [privateProfile, setPrivateProfile] = useState<{
    id: string;
    allow_friend_requests: boolean | null;
    username: string;
    avatar_url: string | null;
    membership_status: string | null;
  } | null>(null);
  const [canViewContent, setCanViewContent] = useState(false);
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
  } | null>(null);


  
  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!session) return;

      const response = await fetch(
        `/api/community/profile?username=${encodeURIComponent(routeUsername)}`,
        { cache: "no-store", credentials: "include" }
      );
      const profileResult = await response.json();
      if (response.status === 403 && profileResult.private && profileResult.profile) {
        setPrivateProfile(profileResult.profile);
        setFriendRequest(profileResult.friendRequest ?? null);
        setLoading(false);
        return;
      }
      if (!response.ok || !profileResult.profile) {
        setLoading(false);
        return;
      }

      const profileData = profileResult.profile;
      setProfile(profileData);
      setCanViewContent(profileResult.canViewContent);
      setProfileStats(profileResult.stats ?? null);
      setIsOwner(session.user.id === profileData.id);
      setIsFriend(profileResult.isFriend);
      setFriendRequest(profileResult.friendRequest);

      const userId = profileData.id;
      const isOwner = session?.user?.id === userId;

      if (!profileResult.canViewContent) {
        setKar([]);
        setRecipes([]);
        setLoading(false);
        return;
      }

      const { data: karRaw } = await supabaseBrowser
        .from("kar")
        .select("*")
        .eq("user_id", userId)
        .order("nummer");

      const { data: batchesRaw } = await supabaseBrowser
        .from("batches")
        .select("*")
        .eq("user_id", userId);

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

        return {
          id: k.id,
          nummer: index + 1,
          created_at: k.created_at,
          status,
          batchName: active?.name ?? secondary?.name ?? null,
        };
      });

      setKar(karProcessed);

      const { data: recipesRaw } = await supabaseBrowser
        .from("recipes")
        .select("*")
        .eq("user_id", userId)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      setRecipes(recipesRaw ?? []);
      setLoading(false);
    }

    load();
  }, [routeUsername]);

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
          <img
            src={
              privateProfile.avatar_url && privateProfile.avatar_url.length > 5
                ? privateProfile.avatar_url
                : "/default-avatar.png"
            }
            alt=""
            className="h-20 w-20 rounded-full border border-white/20 object-cover"
          />
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="          text-sm font-semibold text-white/70">
                      {membershipLabel(privateProfile.membership_status)}
          </p>
          {privateProfile.allow_friend_requests && (
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={!friendRequest ? sendFriendRequest : undefined}
                disabled={!!friendRequest || friendRequestBusy}
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
          <button
            onClick={() => history.back()}
            className="mt-4 rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
          >
            Go back
          </button>
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
          <button
            onClick={() => router.back()}
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

          <MenuOverlay />
        </div>

       {/* PROFILE AVATAR */}
<div className="w-full flex justify-center mb-6">
  <img
    src={
      profile.avatar_url && profile.avatar_url.length > 5
        ? profile.avatar_url
        : "/default-avatar.png"
    }
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

<MembershipStatus status={profile.membership_status} />

{!isOwner && (
  <div className="mb-6 flex justify-center">
    <ReportContentButton
      contentType="profile"
      contentId={profile.id}
      contextUrl={`/members/${encodeURIComponent(profile.username)}`}
    />
  </div>
)}

{!isOwner && (
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
{canViewContent && profile.is_public && profile.featured_recipe_id && (() => {
  const featuredRecipe = recipes.find((recipe) => recipe.id === profile.featured_recipe_id);
  if (!featuredRecipe) return null;
  return (
    <Link
      href={`/my-recipes/${featuredRecipe.id}`}
      className="mb-8 block rounded-xl border border-amber-300/20 bg-amber-300/5 p-5 transition hover:bg-amber-300/10"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Featured recipe</p>
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
                  <div className="bubble-container">
                    {[...Array(12)].map((_, i) => (
                      <span
                        key={i}
                        className="bubble"
                        style={{
                          left: `${Math.random() * 100}%`,
                          animationDuration: `${2 + Math.random() * 3}s`,
                          animationDelay: `${Math.random() * 2}s`,
                          width: `${4 + Math.random() * 6}px`,
                          height: `${4 + Math.random() * 6}px`,
                        }}
                      />
                    ))}
                  </div>
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
        <button
          onClick={() => toggle(r.id)}
          className="w-full flex justify-between items-center text-left"
        >
          <span className="text-xl font-bold text-green-300">
            {r.name.charAt(0).toUpperCase() + r.name.slice(1)}
          </span>

          <span
            className={`text-white text-2xl transition-transform duration-200 ${
              expanded === r.id ? "rotate-90" : "rotate-180"
            }`}
          >
            ▶
          </span>
        </button>

        {/* Slide-down content */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            expanded === r.id ? "max-h-[3000px] mt-4" : "max-h-0"
          }`}
        >
          <div className="space-y-4 opacity-90 text-sm whitespace-pre-wrap">

            {/* Basic stats */}
            <p>
              <strong>OG:</strong> {r.og}
              <strong className="ml-4">FG:</strong> {r.fg}
              <strong className="ml-4">ABV:</strong> {r.abv?.toFixed?.(1)}%
            </p>

            <p><strong>Volume:</strong> <Qty kind="volume" value={r.volume} /></p>

            {/* MEAD */}
            {r.type === "Mead" && (
              <>
                <p><strong>Honey type:</strong> {r.honey_type}</p>
                <p><strong>Honey amount:</strong> <Qty kind="kg" value={r.honey_amount} /></p>

                {r.fruits?.length > 0 && (
                  <div>
                    <strong>Fruits:</strong>
                    {r.fruits.map((f: Fruit, i: number) => (
                      <p key={i}>{f.name}: {f.amount}{f.unit}</p>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* BEER */}
            {r.type === "Beer" && (
              <>
                {r.malts?.length > 0 && (
                  <div>
                    <strong>Malt additions:</strong>
                    {r.malts.map((m: Malt, i: number) => (
                      <p key={i}>{m.name}: <Qty kind="kg" value={m.amount} /></p>
                    ))}
                  </div>
                )}

                {r.hops?.length > 0 && (
                  <div>
                    <strong>Hop schedule:</strong>
                    {r.hops.map((h: Hop, i: number) => (
                      <p key={i}>{h.name}: <Qty kind="g" value={h.amount} maxDecimals={0} /> @ {h.time} min</p>
                    ))}
                  </div>
                )}

                <p><strong>Total boil time:</strong> {r.boil_time} min</p>
              </>
            )}

            {/* BRAGGOT */}
            {r.type === "Braggot" && (
              <>
                {r.malts?.length > 0 && (
                  <div>
                    <strong>Malt additions:</strong>
                    {r.malts.map((m: Malt, i: number) => (
                      <p key={i}>{m.name}: <Qty kind="kg" value={m.amount} /></p>
                    ))}
                  </div>
                )}

                <p><strong>Boil time:</strong> {r.boil_time} min</p>
                <p><strong>Honey:</strong> <Qty kind="kg" value={r.honey_amount} /></p>
              </>
            )}

            {/* CIDER / WINE / SELTZER */}
            {["Cider", "Wine", "Seltzer"].includes(r.type) && (
              <>
                <p><strong>Juice type:</strong> {r.juice_type}</p>
                <p><strong>Sugar added:</strong> <Qty kind="kg" value={r.sugar_amount} /></p>
              </>
            )}

            {/* OTHER */}
            {r.type === "Other" && (
              <>
                {r.ingredients?.length > 0 && (
                  <div>
                    <strong>Ingredients:</strong>
                    {r.ingredients.map((ing: Ingredient, idx: number) => (
                      <p key={idx}>{ing.name}: {ing.amount}{ing.unit}</p>
                    ))}
                  </div>
                )}

                {r.steps?.length > 0 && (
                  <div>
                    <strong>Process steps:</strong>
                    {r.steps.map((s: string, idx: number) => (
                      <p key={idx}>{idx + 1}. {s}</p>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Shared fields */}
            {r.additives && (
              <p><strong>Additives:</strong><br />{r.additives}</p>
            )}

            {r.full_process && (
              <p><strong>Full process:</strong><br />{r.full_process}</p>
            )}

            {r.notes && (
              <p><strong>Notes:</strong><br />{r.notes}</p>
            )}

            {/* Link to full recipe */}
            <div className="flex justify-end pt-4">
              <Link
                href={`/members/${encodeURIComponent(profile.username)}/recipes/${r.id}`}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold"
              >
                Open full recipe →
              </Link>
            </div>
            {!isOwner && (
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
      </div>
    ))
  ) : (
    <p className="opacity-60 text-center">No public recipes.</p>
  )}
</div>

{profileStats && <ProfileAchievements stats={profileStats} />}


  </>
) : (
  <p className="my-10 text-center text-sm text-white/60">
    Their vessels and recipes are private.
  </p>
)}

        <p className="text-sm opacity-40 mt-12 text-center">
          © {new Date().getFullYear()} Batchlog
        </p>

        {/* ⭐ BUBBLE CSS */}
        <style jsx>{`
          .bubble-container {
            position: absolute;
            inset: 0;
            overflow: hidden;
            pointer-events: none;
            z-index: 1;
          }

          .bubble {
            position: absolute;
            bottom: -28px;
            background: rgba(223, 228, 226, 0.28);
            border-radius: 50%;
            filter: blur(1.2px);
            animation-name: sleekRise;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            opacity: 0;
          }

          @keyframes sleekRise {
            0% {
              transform: translateY(0) scale(0.8);
              opacity: 0;
            }
            20% {
              opacity: 0.45;
            }
            60% {
              opacity: 0.55;
            }
            100% {
              transform: translateY(-150px) scale(1.05);
              opacity: 0;
            }
          }
        `}</style>

      </div>
    </main>
  );
}
