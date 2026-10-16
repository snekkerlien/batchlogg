export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";

export async function POST(req: Request) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !hasPermission(await getMembershipRole(supabase, user), "manage_users")) {
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

  const { error } = await serviceRole
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

  if (
    !(await writeAdminAuditEvent(serviceRole, {
      actorId: user.id,
      action: "user.username_updated",
      targetType: "user",
      targetId: userId,
    }))
  ) {
    return NextResponse.json(
      { error: "Username was updated, but the audit log could not be updated." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
