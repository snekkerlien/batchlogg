export const runtime = "edge";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await req.json();
  const ids: number[] = body.ids ?? [];

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

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
