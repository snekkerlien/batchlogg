"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../../lib/supabase/supabaseBrowser";
import MenuOverlay from "./MenuOverlay";
import { useRouter } from "next/navigation";
import PageHeading from "@/app/components/PageHeading";

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
      if (!response.ok || !profileResult.profile) {
        setLoading(false);
        return;
      }

      const profileData = profileResult.profile;
      setProfile(profileData);
      setCanViewContent(profileResult.canViewContent);
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

  async function sendFriendRequest() {
    if (!profile || friendRequestBusy) return;
    setFriendRequestBusy(true);
    setFriendRequestError("");

    try {
      const response = await fetch("/api/community/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "request", userId: profile.id }),
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
      ? "Overview of this user's vessels, active batches, and public recipes."
      : "This is a private profile. You can see their name and profile picture because you’re friends."
  }
/>

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
{/* VESSELS */}
        <h2 className="text-2xl font-semibold mb-4 text-center text-green-300">
          Vessels
        </h2>

        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {kar.length > 0 ? (
            kar.map((k, index) => (
              <Link
                key={k.id}
                href={`/profiles/${encodeURIComponent(profile.username)}/${k.id}`}
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

        <div className="space-y-4">
          {recipes.length > 0 ? (
            recipes.map((r) => (
              <div
                key={r.id}
                className="bg-white/10 border border-white/20 rounded-xl p-4"
              >
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

                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    expanded === r.id ? "max-h-[2000px] mt-4" : "max-h-0"
                  }`}
                >
                  <div className="space-y-3 opacity-90">

                    <p className="text-sm">
                      <strong>OG:</strong> {r.og}
                      <strong className="ml-4">FG:</strong> {r.fg}
                      <strong className="ml-4">ABV:</strong> {r.abv.toFixed(1)}%
                    </p>

                    <p className="text-sm">
                      <strong>Volume:</strong> {r.volume} L
                    </p>

                    {r.ingredients && (
                      <p className="whitespace-pre-line">
                        <strong>Ingredients:</strong>{"\n"}
                        {r.ingredients}
                      </p>
                    )}

                    {r.method && (
                      <p className="whitespace-pre-line">
                        <strong>Method:</strong>{"\n"}
                        {r.method}
                      </p>
                    )}

                    {r.notes && (
                      <p className="whitespace-pre-line">
                        <strong>Notes:</strong>{"\n"}
                        {r.notes}
                      </p>
                    )}

                    <div className="flex justify-end pt-4">
                      <Link
                        href={`/profiles/${encodeURIComponent(profile.username)}/recipes/${r.id}`}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold"
                      >
                        Open note log →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="opacity-60 text-center">No public recipes.</p>
          )}
        </div>
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
