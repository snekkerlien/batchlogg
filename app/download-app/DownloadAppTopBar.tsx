"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import MenuOverlay from "@/app/components/MenuOverlay";
import { useAuthContext } from "@/app/providers/AuthProvider";

function BackIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 19l-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

export default function DownloadAppTopBar() {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  return (
    <>
      <div className="absolute left-4 top-4 z-40">
        {loading || !user ? (
          <Link
            href="/"
            aria-label="Back to landing page"
            title="Back to landing page"
            className="flex items-center justify-center rounded-lg border border-white/20 bg-white/10 p-2 hover:bg-white/20"
          >
            <BackIcon />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/dashboard");
              }
            }}
            aria-label="Go back"
            className="flex items-center justify-center rounded-lg border border-white/20 bg-white/10 p-2 hover:bg-white/20"
          >
            <BackIcon />
          </button>
        )}
      </div>
      {!loading && user && (
        <div className="absolute right-4 top-4 z-40">
          <MenuOverlay current="download-app" />
        </div>
      )}
    </>
  );
}
