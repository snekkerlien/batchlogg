export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  
  // Extract token from Authorization header
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  
  if (!token) {
    
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

  

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

 

  if (!user) {
    
    return NextResponse.json(
      { error: "Invalid token", username: null },
      { status: 401 }
    );
  }

  

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, is_public, avatar_url, use_inventory")
    .eq("id", user.id)
    .single();

  

  if (profileError) {
   
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

  // Count recipes
  const { count: recipeCount } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  

  return NextResponse.json({
    username: profile.username ?? null,
    is_public: profile.is_public ?? false,
    avatar_url: profile.avatar_url ?? null,
    use_inventory: profile.use_inventory ?? false,
    kar_count: karCount ?? 0,
    batch_count: batchCount ?? 0,
    recipe_count: recipeCount ?? 0,
  });
}
