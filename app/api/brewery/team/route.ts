import { NextRequest, NextResponse } from "next/server";
import { getBillingBaseUrl } from "@/lib/billing/stripe";
import {
  getBreweryContext,
  hasBreweryAccess,
  normalizeBreweryMemberRole,
} from "@/lib/brewery/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  username: string | null;
  email: string | null;
};

export async function GET() {
  try {
    const { account, isOwner, serviceRole } = await getBreweryContext();
    if (!account) return NextResponse.json({ error: "Business account not found." }, { status: 404 });
    if (!isOwner) return NextResponse.json({ error: "Only the business owner can manage the team." }, { status: 403 });

    const { data: members, error: membersError } = await serviceRole
      .from("brewery_members")
      .select("user_id, role, created_at")
      .eq("brewery_id", account.id)
      .order("created_at", { ascending: true });
    if (membersError) throw membersError;
    const userIds = (members ?? []).map((member) => member.user_id);
    const { data: profiles, error: profilesError } = userIds.length
      ? await serviceRole.from("profiles").select("id, username, email").in("id", userIds)
      : { data: [], error: null };
    if (profilesError) throw profilesError;
    const profileById = new Map(
      ((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile])
    );

    const teamMembers = await Promise.all((members ?? []).map(async (member) => {
      const profile = profileById.get(member.user_id);
      let email = profile?.email ?? null;
      if (!email) {
        const { data, error } = await serviceRole.auth.admin.getUserById(member.user_id);
        if (error) throw error;
        email = data.user?.email ?? null;
      }
      return {
        id: member.user_id,
        role: normalizeBreweryMemberRole(member.role) ?? "editor",
        createdAt: member.created_at,
        username: profile?.username ?? null,
        email,
      };
    }));

    return NextResponse.json(
      { members: teamMembers },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Could not load business team", error);
    const unauthorized = error instanceof Error && error.message === "Authentication required";
    return NextResponse.json(
      { error: unauthorized ? error.message : "Could not load the business team." },
      { status: unauthorized ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a username or email address." }, { status: 400 });
  }
  const identifier =
    body && typeof body === "object" && "identifier" in body && typeof body.identifier === "string"
      ? body.identifier.trim().toLowerCase()
      : "";
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  if (!identifier || identifier.length > (isEmail ? 254 : 64)) {
    return NextResponse.json({ error: "Enter a valid Batchlogg username or email address." }, { status: 400 });
  }

  try {
    const { user, account, isOwner, serviceRole } = await getBreweryContext();
    if (!account) return NextResponse.json({ error: "Business account not found." }, { status: 404 });
    if (!isOwner) return NextResponse.json({ error: "Only the business owner can manage the team." }, { status: 403 });
    if (!hasBreweryAccess(account)) {
      return NextResponse.json({ error: "An active business account is required to manage the team." }, { status: 403 });
    }

    const profileQuery = serviceRole
      .from("profiles")
      .select("id, username, email");
    const emailPattern = identifier.replace(/[\\%_*]/g, "\\$&");
    const { data: existingProfile, error: profileError } = await (
      isEmail
        ? profileQuery.ilike("email", emailPattern)
        : profileQuery.eq("username", identifier)
    ).maybeSingle();
    if (profileError) throw profileError;
    if (existingProfile?.id === user.id) {
      return NextResponse.json({ error: "You are already the owner of this business." }, { status: 409 });
    }

    let memberId: string;
    let invited = false;
    let memberEmail: string | null = isEmail ? identifier : null;
    if (existingProfile) {
      memberId = existingProfile.id;
      memberEmail = existingProfile.email;
    } else if (isEmail) {
      const { data, error } = await serviceRole.auth.admin.inviteUserByEmail(identifier, {
        redirectTo: `${getBillingBaseUrl()}/business/manage`,
      });
      if (error?.code === "email_exists") {
        return NextResponse.json({
          error: "That email already has a Batchlogg account. Add them by username instead.",
        }, { status: 409 });
      }
      if (error) throw error;
      if (!data.user) throw new Error("Supabase returned no invited user.");
      memberId = data.user.id;
      memberEmail = data.user.email ?? identifier;
      invited = true;
    } else {
      return NextResponse.json({ error: "No Batchlogg account was found for that username." }, { status: 404 });
    }

    const { data: existingMembership, error: membershipLookupError } = await serviceRole
      .from("brewery_members")
      .select("user_id")
      .eq("brewery_id", account.id)
      .eq("user_id", memberId)
      .maybeSingle();
    if (membershipLookupError) throw membershipLookupError;
    if (existingMembership) {
      return NextResponse.json({ error: "That person is already on this business team." }, { status: 409 });
    }

    const { error: insertError } = await serviceRole
      .from("brewery_members")
      .insert({ brewery_id: account.id, user_id: memberId, role: "manager" });
    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "That person is already on this business team." }, { status: 409 });
      }
      if (invited) {
        console.error("Invitation was sent but team membership could not be created", insertError);
        return NextResponse.json({
          error: "The invite email was sent, but the team membership could not be created. Please try again or contact support.",
        }, { status: 500 });
      }
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      invited,
      member: {
        id: memberId,
        username: existingProfile?.username ?? null,
        email: memberEmail,
        role: "manager",
        createdAt: new Date().toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Could not add business team member", error);
    const unauthorized = error instanceof Error && error.message === "Authentication required";
    const message = error instanceof Error && error.message === "NEXT_PUBLIC_APP_URL is not configured"
      ? "Email invitations are not configured yet."
      : unauthorized
        ? error.message
        : "Could not add the team member.";
    return NextResponse.json({ error: message }, { status: unauthorized ? 401 : 500 });
  }
}
