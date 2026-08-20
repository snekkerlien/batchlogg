export const runtime = "edge";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const { supabase } = createRouteHandlerClient();
  const form = await req.formData();

  const karId = form.get("kar_id") as string;

  // Hent session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const user = session.user;

  // Slett karet
  await supabase
    .from("kar")
    .delete()
    .eq("id", karId)
    .eq("user_id", user.id);

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
