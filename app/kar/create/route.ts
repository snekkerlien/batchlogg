export const runtime = "edge";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function POST() {
  // Hent bruker fra JWT som kommer fra klienten
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  // Finn neste nummer
  const { data: existing } = await supabaseServer
    .from("kar")
    .select("nummer")
    .eq("user_id", user.id)
    .order("nummer", { ascending: false })
    .limit(1);

  const nextNummer = existing?.[0]?.nummer + 1 || 1;

  const { data, error } = await supabaseServer
    .from("kar")
    .insert({
      user_id: user.id,
      nummer: nextNummer,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, kar: data });
}
