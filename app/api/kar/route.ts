import { NextResponse, NextRequest } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function GET(
  request: NextRequest,
  { params }: { params: {} }
) {
  const { supabase } = createRouteHandlerClient(request);

  const url = new URL(request.url);
  const userId = url.searchParams.get("user");

  const { data } = await supabase
    .from("kar")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");

  return NextResponse.json(data ?? []);
}
