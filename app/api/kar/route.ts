import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  console.log("=== /api/kar START ===");

  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  // Hent bruker fra token (mest for logging)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("[/api/kar] User:", user);
  console.log("[/api/kar] UserError:", userError);

  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  console.log("[/api/kar] Henter ALLE kar (RLS styrer synlighet)");

  // ⭐ VIKTIG: Ikke filtrer på user_id lenger
  const { data, error } = await supabase
    .from("kar")
    .select("*")
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
