"use client"

import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Batchlogg",
  description: "Oversikt over gjæringskar og batcher",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="no">
      <body className="bg-black text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
