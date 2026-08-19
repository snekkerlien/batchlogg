import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Batchlogg",
  description: "Oversikt over gjæringskar og batcher",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Randomize background position each load
  const randomX = Math.floor(Math.random() * 100);
  const randomY = Math.floor(Math.random() * 100);

  return (
    <html lang="no">
      <body
        className="text-white min-h-screen bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url('/background.png')",
          backgroundPosition: `${randomX}% ${randomY}%`,
        }}
      >
        <div className="min-h-screen bg-black/40">
          {children}
        </div>
      </body>
    </html>
  );
}
