import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { sendStaffNotification } from "@/lib/notifications/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid appeal details" }, { status: 400 });
  }
  const message = "message" in body ? body.message : undefined;
  if (
    typeof message !== "string" ||
    message.trim().length < 3 ||
    message.trim().length > 3000
  ) {
    return NextResponse.json(
      { error: "Write between 3 and 3000 characters for your message." },
      { status: 400 }
    );
  }

  const { data: result, error } = await serviceRole.rpc("submit_ban_appeal", {
    p_user_id: user.id,
    p_message: message.trim(),
  });
  if (error) {
    console.error("Could not submit ban appeal", error);
    return NextResponse.json({ error: "Could not submit your appeal." }, { status: 500 });
  }

  if (result === "not_banned") {
    return NextResponse.json(
      { error: "An appeal can only be sent while your account is banned." },
      { status: 403 }
    );
  }
  if (result === "appeal_exists") {
    return NextResponse.json(
      { error: "You have already sent an appeal. You can only reply when an admin requests more information." },
      { status: 409 }
    );
  }
  if (result !== "success") {
    return NextResponse.json({ error: "Write between 3 and 3000 characters." }, { status: 400 });
  }

  let notificationWarning = false;
  try {
    await sendStaffNotification(serviceRole, {
      subject: "Ban appeal update",
      text: `From: ${user.email ?? user.id}\n\n${message.trim()}`,
      path: "/admin/moderation",
    });
  } catch (notificationError) {
    notificationWarning = true;
    console.error("Ban appeal was saved but its email notification failed", notificationError);
  }

  return NextResponse.json({ success: true, notificationWarning });
}
