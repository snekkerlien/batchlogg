import "./globals.css";
import type { ReactNode } from "react";
import ClientLayout from "./ClientLayout";
import Background from "./Background";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="no">
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
