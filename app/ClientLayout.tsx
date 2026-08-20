"use client";

import { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import Background from "./Background";
import { AuthProvider } from "./providers/AuthProvider";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#111",
            color: "#fff",
            border: "1px solid #333",
          },
        }}
      />

      <Background>
        <AnimatePresence mode="wait">
          <motion.main
            key={Math.random()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="min-h-screen relative z-10"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </Background>
    </AuthProvider>
  );
}
