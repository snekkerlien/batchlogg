import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INTEGER_ID_PATTERN = /^[1-9]\d*$/;

export async function DELETE(request: Request) {
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
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    body = parsed as { id?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id =
    typeof body.id === "number" && Number.isSafeInteger(body.id) && body.id > 0
      ? String(body.id)
      : typeof body.id === "string"
        ? body.id
        : "";
  if (!UUID_PATTERN.test(id) && !INTEGER_ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid audit log entry identifier" }, { status: 400 });
  }

  const { data: deletedEvent, error } = await serviceRole
    .from("admin_audit_log")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Could not delete audit log entry", error);
    return NextResponse.json({ error: "Could not delete audit log entry" }, { status: 500 });
  }
  if (!deletedEvent) {
    return NextResponse.json({ error: "Audit log entry not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
