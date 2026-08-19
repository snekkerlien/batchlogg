"use client";

import { useMemo } from "react";

export default function Background({ children }: { children: React.ReactNode }) {
  // Randomize background position on client
  const randomX = useMemo(() => Math.floor(Math.random() * 100), []);
  const randomY = useMemo(() => Math.floor(Math.random() * 100), []);

  return (
    <div
      className="min-h-screen bg-cover bg-no-repeat text-white"
      style={{
        backgroundImage: "url('/background.png')",
        backgroundPosition: `${randomX}% ${randomY}%`,
      }}
    >
      {/* Overlay */}
      <div className="min-h-screen bg-black/40">
        {children}
      </div>
    </div>
  );
}
