export const runtime = "edge";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  // Opprett server-klient som leser cookies
  const supabase = supabaseServer();

  // Hent innlogget bruker
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Opprett nytt kar
  await supabase.from("kar").insert({
    user_id: user.id,
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
