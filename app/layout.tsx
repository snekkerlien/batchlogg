import "./globals.css";
import type { ReactNode } from "react";
import Background from "./Background";
import { AuthProvider } from "./providers/AuthProvider";

export const metadata = {
  title: "Batchlogg",
  description: "Oversikt over gjæringskar og batcher",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="no">
      <body className="min-h-screen bg-black text-white antialiased">
        <AuthProvider>
          <Background>
            <main className="min-h-screen">
              {children}
            </main>
          </Background>
        </AuthProvider>
      </body>
    </html>
  );
}
