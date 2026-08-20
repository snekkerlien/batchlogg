import { NextResponse, NextRequest } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { supabase } = createRouteHandlerClient(request);

  // params is a Promise in Next.js 16
  const { id } = await context.params;

  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", id)
    .single();

  if (error) {
    console.error("PROFILE API ERROR:", error);
    return NextResponse.json({ username: null });
  }

  return NextResponse.json({ username: data.username });
}
