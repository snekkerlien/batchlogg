import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function GET(req: Request) {
  const { supabase } = createRouteHandlerClient(req);

  const url = new URL(req.url);
  const userId = url.searchParams.get("user");

  const { data } = await supabase
    .from("kar")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");

  return NextResponse.json(data ?? []);
}
