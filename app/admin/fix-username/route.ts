export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";

export async function POST(req: Request) {
  const { supabase } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!hasPermission(await getMembershipRole(supabase, user), "manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, username, email } = await req.json();

  if (
    typeof userId !== "string" ||
    typeof username !== "string" ||
    !userId ||
    !username
  ) {
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
    console.error("Username update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
