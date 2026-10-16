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

  const { userId, newEmail } = await req.json();

  if (
    typeof userId !== "string" ||
    typeof newEmail !== "string" ||
    !userId ||
    !newEmail
  ) {
    return NextResponse.json({ error: "Missing userId or newEmail" }, { status: 400 });
  }

  const { data, error } = await serviceRole.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: true,
  });

  if (error) {
    console.error("Email update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Oppdater profiles.email
  const { error: profileError } = await serviceRole
    .from("profiles")
    .update({ email: newEmail })
    .eq("id", userId);

  if (profileError) {
    console.error("Profile update error:", profileError);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (
    !(await writeAdminAuditEvent(serviceRole, {
      actorId: user.id,
      action: "user.email_updated",
      targetType: "user",
      targetId: userId,
    }))
  ) {
    return NextResponse.json(
      { error: "Email was updated, but the audit log could not be updated." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, user: data });
}
