"use client";

export default function Background({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: "url('/background.png')",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover", // zoomer inn til skjermen, auto-crop
      }}
      className="text-white"
    >
      <div className="min-h-screen bg-black/40">
        {children}
      </div>
    </div>
  );
}
