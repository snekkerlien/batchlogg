export const runtime = "edge";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const form = await req.formData();
  const karId = form.get("kar_id")?.toString() ?? "";

  // Opprett server-klient
  const supabase = supabaseServer();

  // Hent innlogget bruker
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Slett kar
  await supabase
    .from("kar")
    .delete()
    .eq("id", karId)
    .eq("user_id", user.id);

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
