"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

export async function createBatch(formData: FormData) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const kar = Number(formData.get("kar"));
  const name = formData.get("name") as string;
  const volume = Number(formData.get("volume"));
  const startdato = formData.get("startdato") as string;
  const og = Number(formData.get("og"));
  const fg = Number(formData.get("fg"));
  const oppskrift = formData.get("oppskrift") as string;

  const { error } = await supabase.from("batches").insert({
    aktivt_kar: kar,
    name,
    volume_l: volume,
    startdato,
    og,
    fg,
    oppskrift,
    status: "Aktiv",
  });

  if (error) {
    console.error("Feil ved insert:", error);
  }
}
