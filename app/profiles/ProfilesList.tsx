"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../lib/supabase/supabaseBrowser";

export default function ProfilesList({
  profiles,
  favorites
}: {
  profiles: any[];
  favorites: { favorite_profile_id: string }[] | null;
}) {
  const [search, setSearch] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>(
    favorites?.map((f) => f.favorite_profile_id) ?? []
  );

  const [animatingAdd, setAnimatingAdd] = useState<string | null>(null);
  const [animatingRemove, setAnimatingRemove] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session }
      } = await supabaseBrowser.auth.getSession();

      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    }

    loadSession();
  }, []);

  async function toggleFavorite(profileId: string) {
    if (!userId) return;

    const isFav = favoriteIds.includes(profileId);

    if (isFav) {
      // UNFAVORITE → visne-animasjon
      setAnimatingRemove(profileId);
      setTimeout(() => setAnimatingRemove(null), 600);

      await supabaseBrowser
        .from("profile_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("favorite_profile_id", profileId);

        setTimeout(() => {
            setFavoriteIds(prev => prev.filter(id => id !== profileId));
        }, 600);

    } else {
      // FAVORITE → stjernestøv-animasjon
      setAnimatingAdd(profileId);
      setTimeout(() => setAnimatingAdd(null), 600);

      await supabaseBrowser.from("profile_favorites").insert({
        user_id: userId,
        favorite_profile_id: profileId
      });

        setTimeout(() => {
            setFavoriteIds(prev => [...prev, profileId]);
        }, 600); // samme som animasjonstid

    }
  }

  const filtered = profiles.filter((p) =>
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = filtered.sort((a, b) => {
    const aFav = favoriteIds.includes(a.id);
    const bFav = favoriteIds.includes(b.id);

    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;

    return a.username.localeCompare(b.username);
  });

  return (
    <>
      <div className="w-full flex justify-center mb-6">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xl px-4 py-3 rounded-lg bg-black/40 border border-white/20 text-white"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mx-auto max-w-xl">
        {sorted.length > 0 ? (
          sorted.map((p) => (
            <div
              key={p.id}
              className="relative flex flex-col items-center justify-center gap-3 border border-white/10 bg-white/5 hover:bg-white/10 transition rounded-xl p-4"
            >
              {/* STJERNE */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  toggleFavorite(p.id);
                }}
                className={`absolute top-2 right-2 text-yellow-300 text-xl
                  ${animatingAdd === p.id ? "animate-star-add" : ""}
                  ${animatingRemove === p.id ? "animate-star-remove" : ""}
                `}
              >
                {favoriteIds.includes(p.id) ? "★" : "☆"}
              </button>

              {/* STJERNESTØV – kun ved favoritt */}
              {animatingAdd === p.id && (
                <div className="pointer-events-none absolute top-2 right-2 starburst">
                  {[...Array(8)].map((_, i) => (
                    <span key={i} className="particle" />
                  ))}
                </div>
              )}

              <Link
                href={p.id === userId ? "/dashboard" : `/profiles/${p.username}`}
                className="flex flex-col items-center justify-center gap-3"
            >
                <img
                  src={
                    p.avatar_url && p.avatar_url.length > 5
                      ? p.avatar_url
                      : "/default-avatar.png"
                  }
                  className="w-12 h-12 rounded-full object-cover object-center overflow-hidden border border-white/20"
                />

                <span className="font-semibold text-center">
                  {p.username.charAt(0).toUpperCase() + p.username.slice(1)}
                </span>
              </Link>
            </div>
          ))
        ) : (
          <p className="opacity-60 text-center col-span-full">
            No public users found.
          </p>
        )}
      </div>

      {/* ANIMASJONER */}
      <style jsx>{`
        /* FAVORITE → stjernestøv + blink */
        @keyframes starAdd {
          0% {
            transform: scale(1) rotate(0deg);
            filter: brightness(1);
          }
          40% {
            transform: scale(1.6) rotate(12deg);
            filter: brightness(2);
          }
          100% {
            transform: scale(1) rotate(0deg);
            filter: brightness(1);
          }
        }

        .animate-star-add {
          animation: starAdd 0.6s ease-out;
        }

        /* UNFAVORITE → visne/dø */
        @keyframes starRemove {
          0% {
            transform: scale(1);
            filter: brightness(1);
            opacity: 1;
          }
          40% {
            transform: scale(0.6) rotate(-15deg);
            filter: brightness(0.4);
            opacity: 0.6;
          }
          100% {
            transform: scale(0.3) rotate(-25deg);
            filter: brightness(0.2);
            opacity: 0.2;
          }
        }

        .animate-star-remove {
          animation: starRemove 0.6s ease-out;
        }

        /* STJERNESTØV */
        .starburst {
          position: absolute;
          width: 0;
          height: 0;
        }

        .particle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: rgba(255, 255, 150, 0.9);
          border-radius: 50%;
          animation: particleFly 0.6s ease-out forwards;
        }

        @keyframes particleFly {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(
                calc(20px - 40px * var(--x)),
                calc(20px - 40px * var(--y))
              )
              scale(0);
            opacity: 0;
          }
        }

        .particle:nth-child(1) {
          --x: 1;
          --y: 0.2;
        }
        .particle:nth-child(2) {
          --x: 0.7;
          --y: -0.4;
        }
        .particle:nth-child(3) {
          --x: -0.2;
          --y: -1;
        }
        .particle:nth-child(4) {
          --x: -0.8;
          --y: -0.3;
        }
        .particle:nth-child(5) {
          --x: -1;
          --y: 0.4;
        }
        .particle:nth-child(6) {
          --x: -0.3;
          --y: 1;
        }
        .particle:nth-child(7) {
          --x: 0.5;
          --y: 0.9;
        }
        .particle:nth-child(8) {
          --x: 1;
          --y: -0.1;
        }
      `}</style>
    </>
  );
}
