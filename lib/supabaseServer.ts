import { cookies } from "next/headers";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";

export async function createServerClient() {
  // Next.js 16: cookies() er async i server actions → må await'es
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options); // ✔ riktig signatur
        },
        remove(name: string, options: any) {
          cookieStore.set(name, "", options); // ✔ riktig signatur
        },
      },
    }
  );
}
