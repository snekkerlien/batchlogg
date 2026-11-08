import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";
import { getRoadmapReturnPath } from "@/lib/admin/roadmapNavigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const returnTo = getRoadmapReturnPath(requestUrl.searchParams.get("returnTo"));
  const roadmapUrl = (error?: string) => {
    const url = new URL("/admin/roadmap", request.url);
    url.searchParams.set("returnTo", returnTo);
    if (error) url.searchParams.set("error", error);
    return url;
  };
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.redirect(roadmapUrl("forbidden"));
  }

  const role = await getMembershipRole(supabase, user);
  if (!hasPermission(role, "manage_users")) {
    return NextResponse.redirect(roadmapUrl("forbidden"));
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.redirect(roadmapUrl("invalid"));
  }

  const category = form.get("category");
  const message = form.get("message");
  if (
    (category !== "suggestion" && category !== "feedback" && category !== "bug") ||
    typeof message !== "string" ||
    message.trim().length < 3 ||
    message.trim().length > 3000
  ) {
    return NextResponse.redirect(roadmapUrl("invalid"));
  }

  const { data: item, error } = await serviceRole
    .from("roadmap")
    .insert({
      user_id: user.id,
      category,
      status: "planned",
      message: message.trim(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Could not create roadmap entry", error);
    return NextResponse.redirect(roadmapUrl("create"));
  }

  if (
    !(await writeAdminAuditEvent(serviceRole, {
      actorId: user.id,
      action: "roadmap.entry_created",
      targetType: "roadmap_entry",
      targetId: item.id,
      details: { category, status: "planned" },
    }))
  ) {
    return NextResponse.redirect(roadmapUrl("audit"));
  }

  revalidatePath("/admin/roadmap");
  const redirectUrl = roadmapUrl();
  redirectUrl.searchParams.set("created", "1");
  return NextResponse.redirect(redirectUrl);
}
