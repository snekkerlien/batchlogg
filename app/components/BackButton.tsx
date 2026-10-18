"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ href }: { href?: string } = {}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (href) {
          router.push(href);
        } else if (window.history.length > 1) {
          router.back();
        } else {
          router.replace("/dashboard");
        }
      }}
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
  );
}
