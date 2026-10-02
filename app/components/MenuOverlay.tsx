"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { useRouter } from "next/navigation";
import NotificationBell from "@/app/components/NotificationBell";

export default function MenuOverlay({ current }: { current: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !(e.target instanceof Node && menuRef.current.contains(e.target))
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function logout() {
    await supabaseBrowser.auth.signOut();
    router.refresh();
    router.replace("/");
  }

  
  const groups: {
    label: string;
    items: { href: string; label: string; key: string }[];
  }[] = [
    {
      label: "Brewing",
      items: [
        { href: "/dashboard", label: "Dashboard", key: "dashboard" },
        { href: "/batchhistorikk", label: "Batch history", key: "batchhistorikk" },
        { href: "/recipes", label: "My recipes", key: "recipes" },
        { href: "/inventory", label: "Inventory", key: "inventory" },
        { href: "/abvtools", label: "ABV Tools", key: "abvtools" },
      ],
    },
    {
      label: "Community",
      items: [
        { href: "/profiles", label: "Members", key: "profiles" },
        { href: "/community/forum", label: "Forum", key: "forum" },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/account", label: "My account", key: "account" },
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
