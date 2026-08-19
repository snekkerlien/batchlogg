export const runtime = "nodejs";

import { cookies } from "next/headers";
import { createServerClient as createSupabaseClient } from "@supabase/ssr";

/**
 * ROUTE HANDLER CLIENT
 * Brukes i: app/.../route.ts
 */
export function createRouteHandlerClient(req: Request) {
  let responseHeaders = new Headers();

  const getCookieValue = (cookieHeader: string | null, name: string) => {
    if (!cookieHeader) return undefined;
    const parts = cookieHeader.split(";").map((c) => c.trim());
    const match = parts.find((c) => c.startsWith(`${name}=`));
    return match ? match.split("=")[1] : undefined;
  };

  const supabase = createSupabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const header = req.headers.get("cookie");
          return getCookieValue(header, name);
        },
        set(name: string, value: string, options: any) {
          responseHeaders.set(
            "Set-Cookie",
            `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`
          );
        },
        remove(name: string, options: any) {
          responseHeaders.set(
            "Set-Cookie",
            `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
          );
        },
      },
    }
  );

  return { supabase, responseHeaders };
}

/**
 * SERVER ACTION CLIENT
 * Brukes i: "use server" funksjoner
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, "", options);
        },
      },
    }
  );
}
