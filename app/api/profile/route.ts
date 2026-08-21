export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  console.log("=== /api/profile START ===");

  // Hent token fra Authorization-header
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  console.log("[/api/profile] Authorization header:", authHeader);
  console.log("[/api/profile] Ekstrahert token:", token);

  if (!token) {
    console.log("[/api/profile] Ingen token → 401");
    return NextResponse.json(
      { error: "Missing token", username: null },
      { status: 401 }
    );
  }

  // Lag supabase-klient (ingen cookies, kun JWT)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  console.log("[/api/profile] Henter bruker via JWT...");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  console.log("[/api/profile] User:", user);
  console.log("[/api/profile] UserError:", userError);

  if (!user) {
    console.log("[/api/profile] Ingen bruker → 401");
    return NextResponse.json(
      { error: "Invalid token", username: null },
      { status: 401 }
    );
  }

  console.log("[/api/profile] Henter profil fra database...");

  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  console.log("[/api/profile] Profile data:", data);
  console.log("[/api/profile] Profile error:", error);

  if (error) {
    console.log("[/api/profile] FEIL:", error);
    return NextResponse.json(
      { error: "Profile not found", username: null },
      { status: 404 }
    );
  }

  console.log("[/api/profile] SUCCESS");
  console.log("=== /api/profile END ===");

  return NextResponse.json({ username: data?.username ?? null });
}
