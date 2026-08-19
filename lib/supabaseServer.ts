import { createServerClient } from "@supabase/ssr";

export function createRouteHandlerClient(req: Request) {
  let responseHeaders = new Headers();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.headers.get("cookie") ?? "";
        },
        set(name: string, value: string, options: any) {
          responseHeaders.append(
            "Set-Cookie",
            `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`
          );
        },
        remove(name: string, options: any) {
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
