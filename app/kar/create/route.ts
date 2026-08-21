export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  console.log("=== /kar/create START ===");

  const { supabase } = supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("[/kar/create] User:", user);
  console.log("[/kar/create] UserError:", userError);

  if (!user) {
    console.log("[/kar/create] Ingen bruker → 401");
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("kar")
    .select("nummer")
    .eq("user_id", user.id)
    .order("nummer", { ascending: false })
    .limit(1);

  const nextNummer = existing?.[0]?.nummer ? existing[0].nummer + 1 : 1;

  const { data, error } = await supabase
    .from("kar")
    .insert({
      user_id: user.id,
      nummer: nextNummer,
      status: "Ledig",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, kar: data });
}
