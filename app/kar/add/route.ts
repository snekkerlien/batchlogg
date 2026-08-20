export const runtime = "edge";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function POST() {
  const { supabase } = createRouteHandlerClient();

  // Hent session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.user) {
    return NextResponse.redirect("/auth/login");
  }

  const user = session.user;

  // Opprett nytt kar
  await supabase.from("kar").insert({
    user_id: user.id,
  });

  NextResponse.redirect(new URL("/path", req.url));
}
