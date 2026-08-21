export const runtime = "nodejs";

import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { NextResponse } from "next/server";

export async function GET() {
  console.log("=== /auth/session START ===");

  const { supabase, token } = supabaseServer();

  console.log("[/auth/session] Token:", token);

  if (!token) {
    console.log("[/auth/session] Ingen token → user = null");
    return NextResponse.json({ user: null });
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  console.log("[/auth/session] User:", user);
  console.log("[/auth/session] Error:", error);

  console.log("=== /auth/session END ===");

  return NextResponse.json({ user });
}
