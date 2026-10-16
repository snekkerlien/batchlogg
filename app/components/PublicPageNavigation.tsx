"use client";

import Link from "next/link";
import BackButton from "@/app/abv-tools/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import { useAuthContext } from "@/app/providers/AuthProvider";

export default function PublicPageNavigation() {
  const { user, loading } = useAuthContext();

  return (
    <nav
      aria-label={user ? "Site navigation" : "Public site navigation"}
      className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 text-sm"
    >
      {user ? (
        <>
          <BackButton />
          <MenuOverlay current="legal" />
        </>
      ) : (
        <>
          <Link href="/" className="font-semibold text-green-300 hover:underline">
            Batchlogg
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-white/75">
            <Link href="/recipes" className="hover:text-white hover:underline">
              Public recipes
            </Link>
            <Link href="/abv-tools" className="hover:text-white hover:underline">
              ABV tools
            </Link>
            {!loading && (
              <>
                <Link href="/auth/login" className="hover:text-white hover:underline">
                  Log in
                </Link>
                <Link href="/auth/signup" className="hover:text-white hover:underline">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </nav>
  );
}
