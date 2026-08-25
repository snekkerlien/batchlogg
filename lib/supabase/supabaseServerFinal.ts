import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export function supabaseServer() {
  const cookieStore = cookies();

  // Vanlig supabase-klient (autentisert bruker)
  const supabase = createServerClient(
    "https://cvwydrbrxbvezyhvtfma.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          cookieStore.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // Service role klient (admin)
  const serviceRole = createClient(
    "https://cvwydrbrxbvezyhvtfma.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2d3lkcmJyeGJ2ZXp5aHZ0Zm1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA2MTQyMiwiZXhwIjoyMTAyNjM3NDIyfQ.mBVdAIJBe2gZ8HYk32A-0Wf0eAdlueMXTjKeXYzKojs"
  );

  return { supabase, serviceRole };
}
