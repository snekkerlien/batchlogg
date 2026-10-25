"use client";

import BackButton from "@/app/components/BackButton";
import MenuOverlay from "@/app/components/MenuOverlay";
import PublicPageNavigation from "@/app/components/PublicPageNavigation";
import { useAuthContext } from "@/app/providers/AuthProvider";

export default function DownloadAppTopBar() {
  const { user, loading } = useAuthContext();

  if (loading || !user) {
    return (
      <div className="absolute left-4 right-4 top-4 z-40">
        <PublicPageNavigation current="download-app" />
      </div>
    );
  }

  return (
    <>
      <div className="absolute left-4 top-4 z-40">
        <BackButton />
      </div>
      <div className="absolute right-4 top-4 z-40">
        <MenuOverlay current="download-app" />
      </div>
    </>
  );
}
