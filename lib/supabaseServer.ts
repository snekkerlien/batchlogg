import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

export async function supabaseServer() {
  // Next.js 16: cookies() returnerer en Promise → må await'es
  const cookieStore = await cookies();

  return createServerClient(
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
