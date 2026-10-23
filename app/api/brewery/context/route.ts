import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose a valid business account." }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("businessId" in body) ||
    typeof body.businessId !== "string" ||
    !UUID_PATTERN.test(body.businessId)
  ) {
    return NextResponse.json({ error: "Choose a valid business account." }, { status: 400 });
  }

  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const [{ data: ownedAccount, error: ownerError }, { data: membership, error: memberError }] =
    await Promise.all([
      serviceRole
        .from("brewery_accounts")
        .select("id")
        .eq("id", body.businessId)
        .eq("owner_id", user.id)
        .maybeSingle(),
      serviceRole
        .from("brewery_members")
        .select("brewery_id")
        .eq("brewery_id", body.businessId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
  if (ownerError) {
    console.error("Could not verify business ownership", ownerError);
    return NextResponse.json({ error: "Could not switch business accounts." }, { status: 500 });
  }
  if (memberError) {
    console.error("Could not verify business membership", memberError);
    return NextResponse.json({ error: "Could not switch business accounts." }, { status: 500 });
  }
  if (!ownedAccount && !membership) {
    return NextResponse.json({ error: "You do not have access to that business account." }, { status: 403 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("active_brewery_id", body.businessId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
