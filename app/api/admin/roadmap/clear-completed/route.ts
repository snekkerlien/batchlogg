import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export async function DELETE() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const role = await getMembershipRole(supabase, user);
  if (!hasPermission(role, "manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await serviceRole
    .from("roadmap")
    .delete()
    .eq("status", "completed")
    .select("id");
  if (error) {
    console.error("Could not clear completed roadmap entries", error);
    return NextResponse.json({ error: "Could not clear completed roadmap entries." }, { status: 500 });
  }

  revalidatePath("/admin/roadmap");
  if (
    data.length > 0 &&
    !(await writeAdminAuditEvent(serviceRole, {
      actorId: user.id,
      action: "roadmap.completed_cleared",
      targetType: "roadmap",
      details: { count: data.length },
    }))
  ) {
    return NextResponse.json(
      { error: "The entries were deleted, but the action could not be added to the audit log.", deleted: true },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, count: data.length });
}
