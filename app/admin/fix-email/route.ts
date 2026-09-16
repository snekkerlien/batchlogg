export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { userId, newEmail } = await req.json();

  if (!userId || !newEmail) {
    return NextResponse.json({ error: "Missing userId or newEmail" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Oppdater Auth
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: true,
  });

  if (error) {
    console.log("Email update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Oppdater profiles.email
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ email: newEmail })
    .eq("id", userId);

  if (profileError) {
    console.log("Profile update error:", profileError);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, user: data });
}
