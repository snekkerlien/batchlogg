import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { serviceRole } = supabaseServer();
  const { data, error } = await serviceRole
    .from("site_status")
    .select("maintenance_notice_enabled, maintenance_notice, updated_at")
    .eq("id", "main")
    .maybeSingle();
  if (error) {
    console.error("Could not load site status", error);
    return NextResponse.json({ error: "Could not load site status" }, { status: 500 });
  }
  return NextResponse.json({
    maintenanceNotice: data?.maintenance_notice_enabled
      ? data.maintenance_notice
      : null,
  });
}

export async function PATCH(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const role = await getMembershipRole(supabase, user);
  if (!hasPermission(role, "manage_maintenance")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { enabled?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (
    typeof body.enabled !== "boolean" ||
    typeof body.message !== "string" ||
    body.message.trim().length > 500 ||
    (body.enabled && !body.message.trim())
  ) {
    return NextResponse.json({ error: "Invalid maintenance notice" }, { status: 400 });
  }

  const { error } = await serviceRole.from("site_status").upsert({
    id: "main",
    maintenance_notice_enabled: body.enabled,
    maintenance_notice: body.message.trim(),
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("Could not update maintenance notice", error);
    return NextResponse.json({ error: "Could not update maintenance notice" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
