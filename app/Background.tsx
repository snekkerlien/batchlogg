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
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center top",
          backgroundSize: "contain",
          backgroundColor: "black",
        }}
      />

      {/* Fade overlay */}
      <div
        className="app-background-fade fixed inset-x-0 top-0 -z-0 pointer-events-none"
        style={{
          height: "calc(min(100vh, 38.86vw) + 24px)",
          background:
            "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.12) 62%, rgba(0,0,0,0.35) 75%, rgba(0,0,0,0.82) 88%, #000 94%, #000 100%)",
        }}
      />

      <FermentationBubbles variant="viewport" count={14} />

      {/* Innhold */}
      <div className="relative z-[1] min-h-screen bg-black/40">
        {children}
      </div>
    </div>
  );
}
