export default function Background({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/background.png')",
      }}
    >
      <div className="min-h-screen bg-black/40">
        {children}
      </div>
    </div>
  );
}
