"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { useRouter } from "next/navigation";
import NotificationBell from "@/app/components/NotificationBell";

export default function MenuOverlay({ current }: { current: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [canManageKegs, setCanManageKegs] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function loadKegPermission() {
      try {
        const {
          data: { session },
        } = await supabaseBrowser.auth.getSession();

        if (!session) {
          if (active) {
            setCanManageKegs(false);
            setIsAdmin(false);
            setIsModerator(false);
          }
          return;
        }

        const sessionResponse = await fetch("/api/session", {
          cache: "no-store",
          credentials: "include",
        });
        if (!sessionResponse.ok) {
          throw new Error(`Could not load membership role (${sessionResponse.status})`);
        }
        const sessionData: { role: string } = await sessionResponse.json();
        if (active) {
          setIsAdmin(sessionData.role === "admin");
          setIsModerator(sessionData.role === "moderator");
        }

        const response = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Could not load keg permission (${response.status})`);
        }

        const profile = await response.json();
        if (active) {
          setCanManageKegs(
            profile.can_manage_kegs === true || sessionData.role === "admin"
          );
        }
      } catch (error) {
        console.error("Could not load keg management permission", error);
      }
    }

    loadKegPermission();

    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !(e.target instanceof Node && menuRef.current.contains(e.target))
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      active = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function logout() {
    await supabaseBrowser.auth.signOut();
    router.refresh();
    router.replace("/");
  }

  
  const brewingItems: { href: string; label: string; key: string }[] = [
    { href: "/dashboard", label: "Dashboard", key: "dashboard" },
    { href: "/batch-history", label: "Batch history", key: "batchhistorikk" },
    { href: "/my-recipes", label: "My recipes", key: "recipes" },
    { href: "/inventory", label: "Inventory", key: "inventory" },
    { href: "/abv-tools", label: "ABV Tools", key: "abvtools" },
  ];

  if (canManageKegs) {
    brewingItems.push({ href: "/kegs", label: "Kegs", key: "kegs" });
  }

  const groups: {
    label: string;
    items: { href: string; label: string; key: string }[];
  }[] = [
    {
      label: "Brewing",
      items: brewingItems,
    },
    {
      label: "Community",
      items: [
        { href: "/members", label: "Members", key: "profiles" },
        { href: "/community/friends", label: "Friends", key: "friends" },
        { href: "/community/messages", label: "Messages", key: "messages" },
        { href: "/community/forum", label: "Forum", key: "forum" },
      ],
    },
    ...(isAdmin || isModerator
      ? [
          {
            label: isAdmin ? "Admin" : "Moderation",
            items: [
              {
                href: isModerator && !isAdmin ? "/admin/community-reports" : "/admin",
                label: isAdmin ? "Admin panel" : "Community reports",
                key: "admin",
              },
            ],
          },
        ]
      : []),
    {
      label: "Account",
      items: [
        { href: "/my-account", label: "My account", key: "account" },
        { href: "/settings", label: "Settings", key: "settings" },
      ],
    },
  ];

  return (
    <div ref={menuRef} className="relative inline-flex">
      <div className="flex items-center gap-2">
        <NotificationBell onOpen={() => setMenuOpen(false)} />
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
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
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div
          className="
            absolute right-0 top-full mt-2
            bg-black/90 backdrop-blur-md
            border border-white/20
            rounded-lg shadow-xl
            p-3
            text-left
            z-50
            w-56
          "
        >
          {groups.map((group, groupIndex) => (
            <section
              key={group.label}
              aria-label={group.label}
              className={groupIndex > 0 ? "mt-3 border-t border-white/10 pt-3" : ""}
            >
              <h2 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {group.label}
              </h2>
              {group.items.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center px-2 py-2 text-white font-semibold hover:text-green-300 hover:bg-white/5 rounded-md whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                ))}
            </section>
          ))}

          <button
            onClick={logout}
            className="mt-3 w-full border-t border-white/10 px-2 pt-3 text-left text-white font-semibold hover:text-zinc-300 rounded-md whitespace-nowrap"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
