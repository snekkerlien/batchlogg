export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function GET() {
  console.log("=== /api/session START ===");

  // supabaseServer gir oss både supabase-klienten og token
  const { supabase, token } = supabaseServer();

  console.log("[/api/session] Token mottatt:", token);

  if (!token) {
    console.log("[/api/session] Ingen token → returnerer user: null");
    return NextResponse.json({ user: null });
  }

  console.log("[/api/session] Henter bruker via JWT...");

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  console.log("[/api/session] User:", user);
  console.log("[/api/session] Error:", error);

  console.log("=== /api/session END ===");

  return NextResponse.json({ user });
}
