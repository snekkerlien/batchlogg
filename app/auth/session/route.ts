export const runtime = "nodejs";

import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { NextResponse } from "next/server";

export async function GET() {
  console.log("=== /auth/session START ===");

  // Bruk SSR-klienten (leser cookies automatisk)
  const { supabase } = supabaseServer();

  console.log("[/auth/session] Henter bruker via cookies...");

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log("[/auth/session] User:", user);
  console.log("[/auth/session] Error:", error);

  if (!user) {
    console.log("[/auth/session] Ingen bruker → user = null");
    console.log("=== /auth/session END ===");
    return NextResponse.json({ user: null });
  }

  console.log("[/auth/session] Bruker funnet → returnerer user");
  console.log("=== /auth/session END ===");

  return NextResponse.json({ user });
}
