"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import NotificationBell from "@/app/components/NotificationBell";
import PublicNavigationLinks from "@/app/components/PublicNavigationLinks";
import { useAuthContext } from "@/app/providers/AuthProvider";

export default function MenuOverlay({ current }: { current: string }) {
  return (
    <Suspense fallback={null}>
      <MenuOverlayContent current={current} />
    </Suspense>
  );
}

function MenuOverlayContent({ current }: { current: string }) {
  const { user, loading } = useAuthContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [canManageKegs, setCanManageKegs] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!menuOpen) return;
    let activeGroup: string | null = null;
    if (current === "admin" || current === "kegs") {
      activeGroup = isModerator && !isAdmin ? "Moderation" : "Admin";
    } else if (current === "recipes") {
      activeGroup = pathname.startsWith("/my-recipes")
        ? null
        : "Community";
    } else if (current === "brewery") {
      activeGroup = pathname.startsWith("/business/manage") ? "Account" : "More tools";
    } else {
      const groupByCurrent: Record<string, string> = {
        "shopping-list": "More tools",
        "brew-insights": "More tools",
        abvtools: "More tools",
        breweries: "More tools",
        profiles: "Community",
        friends: "Community",
        messages: "Community",
        forum: "Community",
        account: "Account",
        settings: "Account",
      };
      activeGroup = groupByCurrent[current] ?? null;
    }
    setExpandedGroups(activeGroup ? [activeGroup] : []);
  }, [menuOpen, current, pathname, isAdmin, isModerator, canManageKegs]);

  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

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

  if (!user) {
    return (
      <nav aria-label="Public site navigation" className="flex justify-end text-sm">
        <PublicNavigationLinks
          className="flex flex-wrap justify-end gap-x-3 gap-y-2 text-white/75"
          showAuthLinks={!loading}
        />
      </nav>
    );
  }

  const primaryItems: { href: string; label: string; key: string }[] = [
    { href: "/dashboard", label: "Dashboard", key: "dashboard" },
    { href: "/batch-history", label: "Batch history", key: "batchhistorikk" },
    { href: "/my-recipes", label: "My recipes", key: "recipes" },
    { href: "/inventory", label: "Inventory", key: "inventory" },
    { href: "/calendar", label: "Brew calendar", key: "calendar" },
  ];

  const groups: {
    label: string;
    items: { href: string; label: string; key: string }[];
  }[] = [
    {
      label: "More tools",
      items: [
        { href: "/shopping-list", label: "Shopping list", key: "shopping-list" },
        { href: "/brew-insights", label: "Brewing insights", key: "brew-insights" },
        { href: "/abv-tools", label: "Brewing calculators", key: "abvtools" },
        { href: "/business", label: "Beer & Brewing Reviews", key: "breweries" },
      ],
    },
    {
      label: "Community",
      items: [
        { href: "/members", label: "Members", key: "profiles" },
        { href: "/recipes", label: "Public recipes", key: "recipes" },
        { href: "/community/friends", label: "Friends", key: "friends" },
        { href: "/community/messages", label: "Messages", key: "messages" },
        { href: "/community/forum", label: "Forum", key: "forum" },
      ],
    },
    ...(isAdmin || isModerator || canManageKegs
      ? [
          {
            label: isModerator && !isAdmin ? "Moderation" : "Admin",
            items: [
              ...(isAdmin || isModerator
                ? [{
                    href: isModerator && !isAdmin ? "/admin/community-reports" : "/admin",
                    label: isAdmin ? "Admin panel" : "Community reports",
                    key: "admin",
                  }]
                : []),
              ...(canManageKegs
                ? [{ href: "/kegs", label: "Kegs", key: "kegs" }]
                : []),
            ],
          },
        ]
      : []),
    {
      label: "Account",
      items: [
        { href: "/my-account", label: "My account", key: "account" },
        { href: "/business/manage", label: "Business account", key: "brewery" },
        { href: "/settings", label: "Settings", key: "settings" },
      ],
    },
  ];

  function isActiveItem(item: { href: string; key: string }) {
    if (current === "brewery" && pathname.startsWith("/business")) {
      return item.href === (pathname.startsWith("/business/manage") ? "/business/manage" : "/business");
    }
    return item.key === current &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`));
  }

  return (
    <div ref={menuRef} className="relative inline-flex">
      <div className="flex items-center gap-2">
        <NotificationBell onOpen={() => setMenuOpen(false)} />
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="navigation-menu"
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
          id="navigation-menu"
          className="
            menu-overlay-dropdown
            absolute right-0 top-full mt-2
            bg-black/90 backdrop-blur-md
            border border-white/20
            rounded-lg shadow-xl
            p-3 sm:p-4
            text-left
            z-50
            w-[min(20rem,calc(100vw-1rem))]
            max-h-[calc(100dvh-5rem)]
            overflow-y-auto
            sm:max-h-[calc(100dvh-5rem)]
          "
          data-menu-dropdown
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          <section aria-labelledby="workspace-menu-heading" className="mb-2 border-b border-white/10 pb-2">
            <h2
              id="workspace-menu-heading"
              className="px-3 pb-1 text-xs font-semibold text-zinc-400"
            >
              Brewing
            </h2>
            <nav aria-label="Brewing navigation" className="flex flex-col">
              {primaryItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActiveItem(item) ? "page" : undefined}
                  className={`flex min-h-10 items-center border-l-2 px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5 hover:text-green-300 ${
                    isActiveItem(item)
                      ? "border-green-400 bg-white/5 text-green-300"
                      : "border-transparent text-white/90"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </section>

          <div>
            {groups.map((group) => {
              const expanded = expandedGroups.includes(group.label);
              const containsCurrentItem = group.items.some(isActiveItem);
              return (
                <section
                  key={group.label}
                  className="border-b border-white/10 py-1 last:border-b-0"
                >
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedGroups((previous) =>
                      expanded
                        ? previous.filter((label) => label !== group.label)
                        : [group.label]
                    )}
                    className={`flex min-h-10 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-white/5 ${
                      containsCurrentItem ? "text-green-300" : "text-white/80"
                    }`}
                  >
                    {group.label}
                    <span aria-hidden="true" className="ml-3 text-sm text-white/50">
                      {expanded ? "−" : "+"}
                    </span>
                  </button>
                  {expanded && (
                    <nav aria-label={`${group.label} navigation`} className="pb-1 pl-3">
                      {group.items.map((item) => (
                        <Link
                          key={item.key}
                          href={
                            item.key === "messages"
                              ? (() => {
                                  const currentReturnTo =
                                    pathname === "/community/messages"
                                      ? searchParams.get("return_to")
                                      : `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
                                  return currentReturnTo
                                    ? `${item.href}?return_to=${encodeURIComponent(currentReturnTo)}`
                                    : item.href;
                                })()
                              : item.href
                          }
                          onClick={() => setMenuOpen(false)}
                          aria-current={isActiveItem(item) ? "page" : undefined}
                          className={`flex min-h-10 items-center rounded-md border-l-2 px-3 py-2 text-sm transition-colors hover:bg-white/5 hover:text-green-300 ${
                            isActiveItem(item)
                              ? "border-green-400 bg-white/5 text-green-300"
                              : "border-transparent text-white/90"
                          }`}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </nav>
                  )}
                </section>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
            <Link
              href="/download-app"
              onClick={() => setMenuOpen(false)}
              className="hidden min-h-10 items-center rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-green-300 sm:flex"
            >
              Download desktop app
            </Link>
            <button
              type="button"
              onClick={logout}
              className="min-h-10 rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-green-300"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
