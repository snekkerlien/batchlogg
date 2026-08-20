export const runtime = "edge";

import { cookies } from "next/headers";
import {
  createServerClient,
} from "@supabase/ssr";

/**
 * ROUTE HANDLER CLIENT
 * Brukes i: route.ts filer (loginAction, signupAction, logout)
 */
export function createRouteHandlerClient() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map((c) => ({
            name: c.name,
            value: c.value,
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  return { supabase };
}

/**
 * SERVER ACTION CLIENT
 * Brukes i: "use server" funksjoner
 */
export function createServerActionClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map((c) => ({
            name: c.name,
            value: c.value,
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

/**
 * MIDDLEWARE CLIENT
 * Brukes i: middleware.ts
 * Edge-kompatibel Supabase session-håndtering
 */
export function createMiddlewareClient({
  req,
  res,
}: {
  req: Request;
  res: Response;
}) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const raw = req.headers.get("cookie") ?? "";
          return raw.split(";").map((c) => {
            const [name, ...rest] = c.trim().split("=");
            return { name, value: rest.join("=") };
          });
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = [
              `Path=${options?.path ?? "/"}`,
              `HttpOnly`,
              `SameSite=${options?.sameSite ?? "Lax"}`,
              options?.maxAge ? `Max-Age=${options.maxAge}` : "",
            ]
              .filter(Boolean)
              .join("; ");

            res.headers.append("Set-Cookie", `${name}=${value}; ${opts}`);
          });
        },
      },
    }
  );
}
