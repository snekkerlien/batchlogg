import { NextRequest, NextResponse } from "next/server";
import { premiumGateResponse } from "@/lib/auth/plan";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getUserAndAccess() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
  const denied = await premiumGateResponse(serviceRole, user.id);
  if (denied) return { response: denied };
  return { user, serviceRole };
}

export async function GET() {
  const auth = await getUserAndAccess();
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.serviceRole
    .from("saved_analytics_views")
    .select("id, name, filters, created_at, updated_at")
    .eq("user_id", auth.user.id)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("Could not load saved analytics views", error);
    return NextResponse.json({ error: "Could not load saved analytics views" }, { status: 500 });
  }
  return NextResponse.json({ views: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await getUserAndAccess();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const type = typeof record.type === "string" ? record.type.trim() : "All";
  if (!name || name.length > 80 || type.length > 100) {
    return NextResponse.json({ error: "Enter a view name up to 80 characters" }, { status: 400 });
  }

  const { data, error } = await auth.serviceRole
    .from("saved_analytics_views")
    .insert({
      user_id: auth.user.id,
      name,
      filters: { type },
    })
    .select("id, name, filters, created_at, updated_at")
    .single();
  if (error?.code === "23505") {
    return NextResponse.json({ error: "A saved view already has that name" }, { status: 409 });
  }
  if (error) {
    console.error("Could not save analytics view", error);
    return NextResponse.json({ error: "Could not save analytics view" }, { status: 500 });
  }
  return NextResponse.json({ view: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await getUserAndAccess();
  if ("response" in auth) return auth.response;

  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "A valid saved view ID is required" }, { status: 400 });
  }
  const { data, error } = await auth.serviceRole
    .from("saved_analytics_views")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Could not delete saved analytics view", error);
    return NextResponse.json({ error: "Could not delete analytics view" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Saved view not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
