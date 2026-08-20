import { NextResponse, NextRequest } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const { supabase } = createRouteHandlerClient(request);

  const userId = context.params.id;

  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("PROFILE API ERROR:", error);
    return NextResponse.json({ username: null });
  }

  return NextResponse.json({ username: data.username });
}
