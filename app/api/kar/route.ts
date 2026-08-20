import { NextResponse, NextRequest } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function GET(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  const { supabase } = createRouteHandlerClient();

  const url = new URL(request.url);
  const userId = url.searchParams.get("user");

  const { data } = await supabase
    .from("kar")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");

  return NextResponse.json(data ?? []);
}
