import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function supabaseServer() {
  console.log("=== supabaseServer START ===");

  const cookieStore = cookies();
  const headerStore = headers();

  // 1. Prøv Authorization-header (API-routes)
  const authHeader = headerStore.get("Authorization") ?? "";
  const headerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  // 2. Prøv Supabase-cookie (server components)
  const rawCookie = cookieStore.get("sb-cvwydrbrxbvezyhvtfma-auth-token")?.value;

  let cookieToken: string | null = null;

  if (rawCookie) {
    try {
      const parsed = JSON.parse(
        Buffer.from(rawCookie.replace("base64-", ""), "base64").toString("utf-8")
      );
      cookieToken = parsed.access_token;
    } catch (err) {
      console.log("[supabaseServer] FEIL ved parsing av cookie-token:", err);
    }
  }

  // 3. Velg token
  const token = headerToken || cookieToken || null;

  console.log("[supabaseServer] Token valgt:", token);

  // 4. Lag Supabase-klient som bruker cookies automatisk
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  console.log("=== supabaseServer END ===");

  return { supabase, token };
}
