"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "./supabaseBrowser";

export function useSupabaseSessionSync() {
  useEffect(() => {
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      async (_event, session) => {
        await fetch("/api/auth/callback", {
          method: "POST",
          body: JSON.stringify({ session }),
        });
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);
}
