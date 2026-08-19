import "./globals.css";
import type { ReactNode } from "react";
import Background from "./Background";

export const metadata = {
  title: "Batchlogg",
  description: "Oversikt over gjæringskar og batcher",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="no">
      <body>
        <Background>
          {children}
        </Background>
      </body>
    </html>
  );
}
