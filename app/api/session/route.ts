export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function GET() {
  console.log("=== /api/session START ===");

  // Bruk SSR-klienten (leser cookies automatisk)
  const { supabase } = supabaseServer();

  console.log("[/api/session] Henter bruker via cookies...");

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log("[/api/session] User:", user);
  console.log("[/api/session] Error:", error);

  if (!user) {
    console.log("[/api/session] Ingen bruker → returnerer user: null");
    console.log("=== /api/session END ===");
    return NextResponse.json({ user: null });
  }

  console.log("[/api/session] Bruker funnet → returnerer user");
  console.log("=== /api/session END ===");

  return NextResponse.json({ user });
}
