import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { revalidatePath } from "next/cache";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";

export async function POST(req: Request) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  const role = authError ? "member" : await getMembershipRole(supabase, user);
  if (!user || !hasPermission(role, "manage_users")) {
    return NextResponse.redirect(new URL("/admin/feedback?error=forbidden", req.url));
  }

  const form = await req.formData();
  const feedbackId = form.get("feedbackId")?.toString();
  if (!feedbackId) {
    return NextResponse.redirect(new URL("/admin/feedback?error=invalid", req.url));
  }
  const { data, error } = await serviceRole
    .from("feedback")
    .delete()
    .eq("id", feedbackId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Could not delete feedback", error);
    return NextResponse.redirect(new URL("/admin/feedback?error=delete", req.url));
  }
  if (!data) {
    return NextResponse.redirect(new URL("/admin/feedback?error=notfound", req.url));
  }
  if (
    !(await writeAdminAuditEvent(serviceRole, {
      actorId: user.id,
      action: "feedback.deleted",
      targetType: "feedback",
      targetId: feedbackId,
    }))
  ) {
    return NextResponse.redirect(new URL("/admin/feedback?error=audit", req.url));
  }

  revalidatePath("/admin/feedback");

  return NextResponse.redirect(new URL("/admin/feedback?deleted=1", req.url));
}
