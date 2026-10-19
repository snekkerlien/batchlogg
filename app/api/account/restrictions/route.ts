import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Could not check current account restrictions", authError);
    return NextResponse.json({ error: "Could not check account restrictions." }, { status: 503 });
  }
  if (!user) return NextResponse.json({ mute: null });

  let role;
  try {
    role = await getMembershipRole(supabase, user);
  } catch (error) {
    console.error("Could not verify role for current account restrictions", error);
    return NextResponse.json({ error: "Could not check account restrictions." }, { status: 503 });
  }
  if (hasPermission(role, "manage_users")) {
    return NextResponse.json({ mute: null });
  }

  const now = new Date().toISOString();
  const { data: mute, error } = await serviceRole
    .from("user_restrictions")
    .select("ends_at, reason")
    .eq("user_id", user.id)
    .eq("restriction_type", "mute")
    .is("revoked_at", null)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .maybeSingle();
  if (error) {
    console.error("Could not load current account mute", error);
    return NextResponse.json({ error: "Could not check account restrictions." }, { status: 503 });
  }

  return NextResponse.json({ mute });
}
