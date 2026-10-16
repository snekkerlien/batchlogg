export const dynamic = "force-dynamic";
export const runtime = "nodejs";


import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";
import { revalidatePath } from "next/cache";

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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.redirect(new URL("/admin/feedback?error=invalid", req.url));
  }
  const feedbackId = form.get("feedbackId")?.toString();
  if (!feedbackId) {
    return NextResponse.redirect(new URL("/admin/feedback?error=invalid", req.url));
  }

  const { data: feedback, error: fetchError } = await serviceRole
    .from("feedback")
    .select("*")
    .eq("id", feedbackId)
    .single();

  if (fetchError || !feedback) {
    return NextResponse.redirect(new URL("/admin/feedback?error=notfound", req.url));
  }

  const { data: roadmapItem, error: roadmapError } = await serviceRole
    .from("roadmap")
    .insert({
      feedback_id: feedback.id,
      user_id: feedback.user_id,
      category: feedback.category,
      message: feedback.message,
      status: "pending",
    })
    .select("id")
    .single();
  if (roadmapError) {
    console.error("Could not add feedback to roadmap", roadmapError);
    return NextResponse.redirect(new URL("/admin/feedback?error=roadmap", req.url));
  }

  const { error: feedbackDeleteError } = await serviceRole
    .from("feedback")
    .delete()
    .eq("id", feedbackId);
  if (feedbackDeleteError) {
    console.error("Roadmap item was created but feedback could not be removed", feedbackDeleteError);
    return NextResponse.redirect(new URL("/admin/feedback?error=delete", req.url));
  }
  if (
    !(await writeAdminAuditEvent(serviceRole, {
      actorId: user.id,
      action: "feedback.added_to_roadmap",
      targetType: "roadmap_entry",
      targetId: roadmapItem.id,
      details: { feedback_id: feedback.id },
    }))
  ) {
    return NextResponse.redirect(new URL("/admin/feedback?error=audit", req.url));
  }

  revalidatePath("/admin/feedback");
  revalidatePath("/admin/roadmap");

  return NextResponse.redirect(new URL("/admin/feedback?added=1", req.url));
}
