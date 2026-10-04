"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "./supabaseBrowser";

export function useSupabaseSessionSync() {
  useEffect(() => {
    const { data: listener } = supabaseBrowser.auth.onAuthStateChange(
      (event, session) => {
        if (!session && event !== "SIGNED_OUT") {
          return;
        }

        window.setTimeout(() => {
          void (async () => {
            try {
              const response = await fetch("/api/auth/callback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ session }),
              });
              if (!response.ok) {
                const result = await response.json().catch(() => null);
                console.error(
                  `Could not synchronize Supabase session after ${event}`,
                  result?.error ?? response.status
                );
              }
            } catch (error) {
              console.error(
                `Could not synchronize Supabase session after ${event}`,
                error
              );
            }
          })();
        }, 0);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);
}
