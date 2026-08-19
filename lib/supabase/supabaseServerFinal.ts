export const runtime = "nodejs";

import { createServerClient as createSupabaseClient } from "@supabase/ssr";

/**
 * ROUTE HANDLER CLIENT
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
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return getCookieValue(name);
        },
        set(name: string, value: string) {
          responseHeaders.set(
            "Set-Cookie",
            `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`
          );
        },
        remove(name: string) {
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
 * SERVER ACTION CLIENT — Next.js 16 safe
 */
export async function createServerClient() {
  // Next.js 16: server actions har globalThis.request tilgjengelig
  const req = (globalThis as any).request;
  const cookieHeader = req?.headers?.get("cookie") ?? "";

  const getCookieValue = (name: string) => {
    const parts = cookieHeader.split(";").map((c: string) => c.trim());
    const match = parts.find((c: string) => c.startsWith(`${name}=`));
    return match ? match.split("=")[1] : undefined;
  };

  return createSupabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return getCookieValue(name);
        },
        set() {},
        remove() {},
      },
    }
  );
}
