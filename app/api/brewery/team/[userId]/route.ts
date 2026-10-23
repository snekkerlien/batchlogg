import { NextRequest, NextResponse } from "next/server";
import { getBreweryContext, hasBreweryAccess } from "@/lib/brewery/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  _request: Request,
  { params }: { params: { userId: string } }
) {
  if (!UUID_PATTERN.test(params.userId)) {
    return NextResponse.json({ error: "Invalid team member." }, { status: 400 });
  }

  try {
    const { account, isOwner, serviceRole } = await getBreweryContext();
    if (!account) return NextResponse.json({ error: "Business account not found." }, { status: 404 });
    if (!isOwner) return NextResponse.json({ error: "Only the business owner can manage the team." }, { status: 403 });

    const { data, error } = await serviceRole
      .from("brewery_members")
      .delete()
      .eq("brewery_id", account.id)
      .eq("user_id", params.userId)
      .select("user_id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not remove business team member", error);
    const unauthorized = error instanceof Error && error.message === "Authentication required";
    return NextResponse.json(
      { error: unauthorized ? error.message : "Could not remove the team member." },
      { status: unauthorized ? 401 : 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  if (!UUID_PATTERN.test(params.userId)) {
    return NextResponse.json({ error: "Invalid team member." }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose a valid team role." }, { status: 400 });
  }
  const role =
    body && typeof body === "object" && "role" in body && typeof body.role === "string"
      ? body.role
      : "";
  if (!["manager", "editor"].includes(role)) {
    return NextResponse.json({ error: "Choose Manager or Editor." }, { status: 400 });
  }

  try {
    const { account, isOwner, serviceRole } = await getBreweryContext();
    if (!account) return NextResponse.json({ error: "Business account not found." }, { status: 404 });
    if (!isOwner) return NextResponse.json({ error: "Only the business owner can manage the team." }, { status: 403 });
    if (!hasBreweryAccess(account)) {
      return NextResponse.json({ error: "An active business account is required to manage the team." }, { status: 403 });
    }

    const { data, error } = await serviceRole
      .from("brewery_members")
      .update({ role })
      .eq("brewery_id", account.id)
      .eq("user_id", params.userId)
      .select("user_id, role")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    return NextResponse.json({ success: true, role: data.role });
  } catch (error) {
    console.error("Could not update business team member role", error);
    const unauthorized = error instanceof Error && error.message === "Authentication required";
    return NextResponse.json(
      { error: unauthorized ? error.message : "Could not update the team member role." },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
