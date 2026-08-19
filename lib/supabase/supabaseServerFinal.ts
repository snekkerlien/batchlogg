export const runtime = "nodejs";

import { cookies } from "next/headers";
import { createServerClient as createSupabaseClient } from "@supabase/ssr";

/**
 * ROUTE HANDLER CLIENT
 */
export function createRouteHandlerClient(req: Request) {
  let responseHeaders = new Headers();

  const cookieHeader = req.headers.get("cookie") ?? "";

  const getCookieValue = (name: string) => {
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
          return getCookieValue(name);
        },
        set(name: string, value: string) {
          responseHeaders.append(
            "Set-Cookie",
            `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`
          );
        },
        remove(name: string) {
          responseHeaders.append(
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
 * SERVER ACTION CLIENT — Next.js 16 safe
 */
export async function createServerClient() {
  const cookieStore = await cookies(); // ← MÅ awaites i Next.js 16

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
