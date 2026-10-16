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
  if (authError || !user) {
    return NextResponse.redirect(new URL("/admin/roadmap?error=forbidden", req.url));
  }
  const role = await getMembershipRole(supabase, user);
  if (!hasPermission(role, "manage_users")) {
    return NextResponse.redirect(new URL("/admin/roadmap?error=forbidden", req.url));
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.redirect(new URL("/admin/roadmap?error=invalid", req.url));
  }

  const id = form.get("id");
  const status = form.get("status");
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
    (status !== "pending" &&
      status !== "planned" &&
      status !== "in_progress" &&
      status !== "completed")
  ) {
    return NextResponse.redirect(new URL("/admin/roadmap?error=invalid", req.url));
  }

  const result = await serviceRole
    .from("roadmap")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (result.error) {
    console.error("Could not update roadmap entry", result.error);
    return NextResponse.redirect(new URL("/admin/roadmap?error=update", req.url));
  }
  if (!result.data) {
    return NextResponse.redirect(new URL("/admin/roadmap?error=notfound", req.url));
  }

  if (
    !(await writeAdminAuditEvent(serviceRole, {
      actorId: user.id,
      action: "roadmap.status_updated",
      targetType: "roadmap_entry",
      targetId: id,
      details: { status },
    }))
  ) {
    return NextResponse.redirect(new URL("/admin/roadmap?error=audit", req.url));
  }

  revalidatePath("/admin/roadmap");
  const redirectUrl = new URL("/admin/roadmap", req.url);
  if (status === "completed") redirectUrl.searchParams.set("completed", "1");
  return NextResponse.redirect(redirectUrl);
}

export async function DELETE(req: Request) {
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

  let body: { id?: unknown };
  try {
    const parsed: unknown = await req.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    body = parsed as { id?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)
  ) {
    return NextResponse.json({ error: "Invalid roadmap entry identifier" }, { status: 400 });
  }

  const { data, error } = await serviceRole
    .from("roadmap")
    .delete()
    .eq("id", body.id)
    .eq("status", "completed")
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Could not delete completed roadmap entry", error);
    return NextResponse.json({ error: "Could not delete roadmap entry" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Only completed roadmap entries can be deleted." },
      { status: 409 }
    );
  }

  if (
    !(await writeAdminAuditEvent(serviceRole, {
      actorId: user.id,
      action: "roadmap.entry_removed",
      targetType: "roadmap_entry",
      targetId: body.id,
    }))
  ) {
    return NextResponse.json(
      { error: "The entry was deleted, but the deletion could not be added to the audit log." },
      { status: 500 }
    );
  }

  revalidatePath("/admin/roadmap");
  return NextResponse.json({ success: true });
}
