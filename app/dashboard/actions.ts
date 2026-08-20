"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function addKar() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Tell hvor mange kar brukeren har
  const { data: kar } = await supabase
    .from("kar")
    .select("id")
    .eq("user_id", user.id);

  if (kar && kar.length >= 9) return; // maks 9

  const nyttNavn = `Kar ${(kar?.length ?? 0) + 1}`;

  await supabase.from("kar").insert({
    user_id: user.id,
    navn: nyttNavn,
  });
}
