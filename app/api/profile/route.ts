export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  console.log("=== /api/profile START ===");

  // Extract token from Authorization header
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  console.log("[/api/profile] Authorization header:", authHeader);
  console.log("[/api/profile] Extracted token:", token);

  if (!token) {
    console.log("[/api/profile] Missing token → 401");
    return NextResponse.json(
      { error: "Missing token", username: null },
      { status: 401 }
    );
  }

  // Supabase client (JWT only)
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

  console.log("[/api/profile] Fetching user via JWT...");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  console.log("USER ID FROM AUTH:", user?.id ?? "NO USER");
  console.log("[/api/profile] User:", user);
  console.log("[/api/profile] UserError:", userError);

  if (!user) {
    console.log("[/api/profile] Invalid token → 401");
    return NextResponse.json(
      { error: "Invalid token", username: null },
      { status: 401 }
    );
  }

  console.log("[/api/profile] Fetching profile from database...");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, is_public")
    .eq("id", user.id as unknown as string)
    .single();

  console.log("[/api/profile] Profile data:", profile);
  console.log("[/api/profile] Profile error:", profileError);

  if (profileError) {
    console.log("[/api/profile] ERROR:", profileError);
    return NextResponse.json(
      { error: "Profile not found", username: null },
      { status: 404 }
    );
  }

  // Count vessels
  const { count: karCount } = await supabase
    .from("kar")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Count batches
  const { count: batchCount } = await supabase
    .from("batches")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Count recipes (IMPORTANT FIX)
  const { count: recipeCount } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  console.log("[/api/profile] SUCCESS");
  console.log("=== /api/profile END ===");

  return NextResponse.json({
    username: profile.username ?? null,
    is_public: profile.is_public ?? false,
    kar_count: karCount ?? 0,
    batch_count: batchCount ?? 0,
    recipe_count: recipeCount ?? 0,
  });
}
