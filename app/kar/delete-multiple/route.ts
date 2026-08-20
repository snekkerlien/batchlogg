export const runtime = "edge";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const { supabase } = createRouteHandlerClient();

  // Hent session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const user = session.user;

  // Hent body
  const body = await req.json();
  const ids: number[] = body.ids ?? [];

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

  // Slett kar som tilhører brukeren
  const { error } = await supabase
    .from("kar")
    .delete()
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
