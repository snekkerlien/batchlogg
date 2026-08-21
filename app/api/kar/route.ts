import { NextResponse, NextRequest } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("user");

  const { data, error } = await supabaseServer
    .from("kar")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
