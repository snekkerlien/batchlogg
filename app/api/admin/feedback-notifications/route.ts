import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { serviceRole, isAdmin: false, authed: false };
  const role = await getMembershipRole(supabase, user);
  return {
    serviceRole,
    authed: true,
    isAdmin: hasPermission(role, "manage_users"),
  };
}

export async function GET() {
  const { serviceRole, isAdmin, authed } = await requireAdmin();
  if (!authed) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!isAdmin) return NextResponse.json({ notifications: [], unreadCount: 0 });

  const { data, error } = await serviceRole
    .from("feedback")
    .select("id, username, email, category, message, created_at, read_at")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Could not load feedback notifications", error);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  const notifications = (data ?? []).map((item) => ({
    id: item.id,
    category: item.category,
    message: item.message,
    sender: item.username || item.email || "A member",
    created_at: item.created_at,
    read_at: item.read_at,
  }));
  return NextResponse.json({ notifications, unreadCount: notifications.length });
}

export async function PATCH(request: NextRequest) {
  const { serviceRole, isAdmin, authed } = await requireAdmin();
  if (!authed) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!isAdmin) return NextResponse.json({ success: true });

  let body: { ids?: unknown; all?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let query = serviceRole
    .from("feedback")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (body.all !== true) {
    if (
      !Array.isArray(body.ids) ||
      body.ids.length === 0 ||
      body.ids.length > 20 ||
      body.ids.some((id) => typeof id !== "string" || !UUID.test(id))
    ) {
      return NextResponse.json({ error: "A list of IDs is required" }, { status: 400 });
    }
    query = query.in("id", body.ids as string[]);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: "Could not update notifications" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// Clearing only dismisses the notifications; the feedback itself is kept.
export async function DELETE() {
  const { serviceRole, isAdmin, authed } = await requireAdmin();
  if (!authed) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!isAdmin) return NextResponse.json({ success: true });

  const { error } = await serviceRole
    .from("feedback")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) {
    return NextResponse.json({ error: "Could not clear notifications" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
