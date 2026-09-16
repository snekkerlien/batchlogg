export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { userId, username, email } = await req.json();

  if (!userId || !username) {
    return NextResponse.json({ error: "Missing userId or username" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false }
    }
  );

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      username,
      ...(email ? { email } : {}) // ← oppdater email hvis sendt inn
    })
    .eq("id", userId);

  if (error) {
    console.log("Username update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
