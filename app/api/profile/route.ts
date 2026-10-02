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

  const serviceRole = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const { data: profile, error: profileError } = await serviceRole
    .from("profiles")
    .select("username, is_public, avatar_url, snus_is_true, theme_accent_color")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Could not load authenticated user's profile", profileError);
    return NextResponse.json(
      { error: "Could not load profile" },
      { status: profileError.code === "PGRST116" ? 404 : 500 }
    );
  }

  return NextResponse.json({
    username: profile.username,
    is_public: profile.is_public,
    avatar_url: profile.avatar_url,
    snus_is_true: profile.snus_is_true,
    theme_accent_color: profile.theme_accent_color,
  });
}
