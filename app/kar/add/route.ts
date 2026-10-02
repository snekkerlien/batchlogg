export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const { supabase } = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const { data, error } = await supabase.rpc("create_kar_with_limit");

  if (error) {
    console.error("Failed to create vessel", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data.created) {
    return NextResponse.redirect(
      new URL("/dashboard?error=vessel-limit", req.url)
    );
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
