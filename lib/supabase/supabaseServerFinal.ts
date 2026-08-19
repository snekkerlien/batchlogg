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
 * SERVER ACTION CLIENT — Cookie fallback (stabil)
 */
export async function createServerClient() {
  const req = (globalThis as any).request;
  const resHeaders = (globalThis as any).responseHeaders ?? new Headers();

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
        set(name: string, value: string) {
          resHeaders.append(
            "Set-Cookie",
            `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`
          );
        },
        remove(name: string) {
          resHeaders.append(
            "Set-Cookie",
            `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
          );
        },
      },
    }
  );
}
