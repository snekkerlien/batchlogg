import { NextResponse, NextRequest } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function GET(request: NextRequest) {
  const { supabase } = createRouteHandlerClient(request);

  // Session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ redirect: "/auth/login" });
  }

  // Username
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  // Kar
  const { data: kar } = await supabase
    .from("kar")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at");

  return NextResponse.json({
    user,
    username: profile?.username ?? null,
    kar: kar ?? [],
  });
}
