import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  console.log("=== /api/kar START ===");

  const url = new URL(request.url);
  const userId = url.searchParams.get("user");

  // Hent JWT-token fra Authorization-header
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  console.log("[/api/kar] Token:", token);

  if (!token) {
    console.log("[/api/kar] Ingen token → 401");
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  // Lag en Supabase-klient som bruker tokenet
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

  console.log("[/api/kar] Henter kar for bruker:", userId);

  const { data, error } = await supabase
    .from("kar")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");

  console.log("[/api/kar] Resultat:", { data, error });

  if (error) {
    console.log("[/api/kar] FEIL:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("=== /api/kar END ===");
  return NextResponse.json(data ?? []);
}
