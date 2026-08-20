"use client";

export default function Background({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-cover bg-no-repeat bg-center text-white"
      style={{
        backgroundImage: "url('/background.png')",
      }}
    >
      {/* Overlay */}
      <div className="min-h-screen bg-black/40">
        {children}
      </div>
    </div>
  );
}
