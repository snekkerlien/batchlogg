import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Batchlogg",
  description: "Oversikt over gjæringskar og batcher",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="no">
      <body
        className="text-white min-h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/background.png')" }}
      >
        {children}
      </body>
    </html>
  );
}
