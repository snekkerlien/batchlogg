export const runtime = "nodejs";

import { createServerClient as createSupabaseClient } from "@supabase/ssr";

/**
 * ROUTE HANDLER CLIENT
 * Brukes i: route.ts filer (loginAction, signupAction, logout)
 */
export function createRouteHandlerClient(req: Request) {
  let responseHeaders = new Headers();

  const cookieHeader = req.headers.get("cookie") ?? "";

  const getCookieValue = (name: string) => {
    const parts = cookieHeader.split(";").map((c: string) => c.trim());
    const match = parts.find((c: string) => c.startsWith(`${name}=`));
    return match ? match.split("=")[1] : undefined;
  };

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
 * SERVER ACTION CLIENT
 * Brukes i: "use server" funksjoner
 */
export async function createServerClient() {
  const cookieStore = await import("next/headers").then((m) => m.cookies());

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}
