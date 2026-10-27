"use client";

import FermentationBubbles from "./components/FermentationBubbles";

export default function Background({
  children,
  background = "/background3.png", // default
}: {
  children: React.ReactNode;
  background?: string;
}) {
  return (
    <div className="min-h-screen text-white relative">

      {/* Bakgrunnsbilde */}
      <div
        className="app-background-image fixed inset-0 -z-10"
        style={{
          backgroundImage: `url('${background}')`,
        }}
      />

      {/* Fade overlay */}
      <div
        className="app-background-fade fixed inset-x-0 top-0 -z-0 pointer-events-none"
      />

      <FermentationBubbles variant="viewport" count={14} />

      {/* Innhold */}
      <div className="relative z-[1] min-h-screen bg-black/40">
        {children}
      </div>
    </div>
  );
}
