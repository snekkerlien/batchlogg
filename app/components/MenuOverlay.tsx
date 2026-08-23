"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { useRouter } from "next/navigation";

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

  const items = [
    { href: "/dashboard", label: "Dashboard", key: "dashboard" },
    { href: "/recipes", label: "My recipes", key: "recipes" },
    { href: "/batchhistorikk", label: "Batch history", key: "batchhistorikk" },
    { href: "/profiles", label: "Community", key: "profiles" },
    { href: "/account", label: "My account", key: "account" },
  ];

  return (
    <div ref={menuRef} className="relative inline-flex">
      {!menuOpen && (
        <button
          onClick={() => setMenuOpen(true)}
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
      )}

      {menuOpen && (
        <div
          className="
            absolute right-0 top-0
            bg-black/90 backdrop-blur-md
            border border-white/20
            rounded-lg shadow-xl
            p-4
            text-right
            z-50
            w-max
            max-w-fit
          "
        >
          {items
            .filter((i) => i.key !== current)
            .map((i) => (
              <Link
                key={i.key}
                href={i.href}
                className="
                  flex items-center justify-end
                  px-2 py-2
                  mb-2
                  text-white font-semibold
                  hover:text-green-300
                  rounded-md
                  whitespace-nowrap
                "
              >
                {i.label}
              </Link>
            ))}

          <button
            onClick={logout}
            className="
              px-2 py-2
              text-red-400 font-semibold
              hover:text-red-300
              rounded-md
              whitespace-nowrap
            "
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
