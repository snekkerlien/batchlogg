export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
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

  // ✔ anon-key (ikke service role)
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
  } = await supabase.auth.getUser(token);

  if (!user) {
    return NextResponse.json(
      { error: "Invalid token", username: null },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, is_public, avatar_url, snus_is_true")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    username: profile?.username ?? null,
    is_public: profile?.is_public ?? false,
    avatar_url: profile?.avatar_url ?? null,
    snus_is_true: profile?.snus_is_true ?? false,
  });
}
