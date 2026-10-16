import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";

export async function POST(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  const role = authError ? "member" : await getMembershipRole(supabase, user);
  if (!user || !hasPermission(role, "manage_users")) {
    return NextResponse.redirect(new URL("/admin/feedback?error=forbidden", request.url));
  }

  const form = await request.formData();
  const id = form.get("id")?.toString();
  const status = form.get("status")?.toString();

  if (!id || !status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }

  const { data, error } = await serviceRole
    .from("feedback")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Could not update feedback status", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.redirect(new URL("/admin/feedback?error=notfound", request.url));
  }
  if (
    !(await writeAdminAuditEvent(serviceRole, {
      actorId: user.id,
      action: "feedback.status_updated",
      targetType: "feedback",
      targetId: id,
      details: { status },
    }))
  ) {
    return NextResponse.redirect(new URL("/admin/feedback?error=audit", request.url));
  }

  return NextResponse.redirect(new URL("/admin/feedback", request.url));
}
