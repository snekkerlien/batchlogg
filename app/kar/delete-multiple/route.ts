export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  console.log("=== DELETE MULTIPLE START ===");

  const { supabase } = supabaseServer();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  console.log("Bruker:", user);
  console.log("UserError:", userError);

  if (!user) {
    console.log("Ingen bruker funnet → 401");
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await req.json();
  const ids: string[] = body.ids ?? [];

  console.log("Mottatte IDs:", ids);

  if (!Array.isArray(ids) || ids.length === 0) {
    console.log("Ingen IDs → 400");
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("kar")
    .delete()
    .in("id", ids);

  console.log("Delete result:", data);
  console.log("Delete error:", error);

  console.log("=== DELETE MULTIPLE END ===");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
