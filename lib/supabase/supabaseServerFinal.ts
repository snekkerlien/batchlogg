import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export function supabaseServer() {
  const cookieStore = cookies();

  function writeCookie(name: string, value: string, options: any) {
    try {
      cookieStore.set({
        name,
        value,
        ...options,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes(
          "Cookies can only be modified in a Server Action or Route Handler"
        )
      ) {
        return;
      }

      throw error;
    }
  }

  // Vanlig supabase-klient (autentisert bruker)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,        // ✔ hent fra env
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,  // ✔ hent fra env
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          writeCookie(name, value, options);
        },
        remove(name: string, options: any) {
          writeCookie(name, "", options);
        },
      },
    }
  );

  // Service role klient (admin)
  const serviceRole = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,        // ✔ hent fra env
    process.env.SUPABASE_SERVICE_ROLE_KEY!        // ✔ hent fra env
  );

  return { supabase, serviceRole };
}
