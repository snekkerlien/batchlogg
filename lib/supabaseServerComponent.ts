import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createServerComponentClient() {
  const cookieStore = await cookies(); // hos deg er cookies() async

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // READ-ONLY: disse må være NO-OP
        set() {},
        remove() {},
      },
    }
  );
}
