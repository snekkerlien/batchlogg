"use client";

import Link from "next/link";
import BackButton from "@/app/abv-tools/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PublicNavigationLinks from "@/app/components/PublicNavigationLinks";
import { useAuthContext } from "@/app/providers/AuthProvider";

export default function PublicPageNavigation({
  current = "legal",
}: {
  current?: string;
}) {
  const { user, loading } = useAuthContext();

  return (
    <nav
      aria-label={user ? "Site navigation" : "Public site navigation"}
      className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 text-sm"
    >
      {user ? (
        <>
          <BackButton />
          <MenuOverlay current={current} />
        </>
      ) : (
        <>
          <Link href="/" className="font-semibold text-green-300 hover:underline">
            Batchlogg
          </Link>
          <PublicNavigationLinks
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-white/75"
            showAuthLinks={!loading}
          />
        </>
      )}
    </nav>
  );
}
