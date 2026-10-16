import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import ClientLayout from "./(ui)/ClientLayout";
import Background from "./Background";

export const metadata: Metadata = {
  metadataBase: new URL("https://batchlogg.vercel.app"),
  applicationName: "Batchlogg",
  title: {
    default: "Batchlogg — Brewing workspace",
    template: "%s | Batchlogg",
  },
  description:
    "Track brewing batches, refine recipes, manage inventory, calculate ABV, and connect with other brewers using Batchlogg.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="no">
      <head>
        {/* BLOCK MICROSOFT COPILOT */}
        <meta name="copilot" content="no-assist" />
      </head>

      <body className="min-h-screen bg-black text-white antialiased relative overflow-x-hidden">
        <Background>
          <ClientLayout>
            {children}
          </ClientLayout>
        </Background>
      </body>
    </html>
  );
}
