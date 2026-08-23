"use client";

export default function Background({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-white relative">

      {/* Bakgrunnsbilde */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: "url('/background.png')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center top",
          backgroundSize: "contain",
          backgroundColor: "black",
        }}
      />

      {/* Perfekt fade som skalerer riktig ved zoom */}
      <div
        className="fixed inset-0 -z-0 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 60%)",
        }}
      />

      {/* Innhold */}
      <div className="relative min-h-screen bg-black/40">
        {children}
      </div>
    </div>
  );
}
