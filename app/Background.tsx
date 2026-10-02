"use client";

export default function Background({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-white relative">

      {/* Bakgrunnsbilde */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: "url('/background3.png')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center top",
          backgroundSize: "contain",
          backgroundColor: "black",
        }}
      />

      <div
        className="fixed inset-x-0 top-0 -z-0 pointer-events-none"
        style={{
          height: "min(100vh, 38.86vw)",
          background:
            "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.12) 62%, rgba(0,0,0,0.35) 75%, rgba(0,0,0,0.72) 88%, #000 100%)",
        }}
      />

      {/* Innhold */}
      <div className="relative min-h-screen bg-black/40">
        {children}
      </div>
    </div>
  );
}
