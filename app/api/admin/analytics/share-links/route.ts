import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";
import { decryptSponsorToken, encryptSponsorToken } from "@/lib/analytics/sponsorShare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LINK_DAYS = 365;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorize() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  if (!hasPermission(await getMembershipRole(supabase, user), "view_analytics")) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, serviceRole };
}

export async function GET(request: NextRequest) {
  const context = await authorize();
  if ("response" in context) return context.response;

  const { data, error } = await context.serviceRole
    .from("sponsor_analytics_links")
    .select("id, created_at, expires_at, revoked_at, encrypted_token")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("Could not load sponsor analytics links", error);
    return NextResponse.json({ error: "Could not load sponsor links" }, { status: 500 });
  }

  try {
    return NextResponse.json(
      {
        links: (data ?? []).map((link) => {
          const token = link.encrypted_token
            ? decryptSponsorToken(link.encrypted_token)
            : null;
          return {
            id: link.id,
            created_at: link.created_at,
            expires_at: link.expires_at,
            revoked_at: link.revoked_at,
            url: token ? `${request.nextUrl.origin}/sponsor/analytics/${token}` : null,
          };
        }),
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (decryptError) {
    console.error("Could not decrypt sponsor analytics link", decryptError);
    return NextResponse.json(
      { error: "Could not load sponsor link addresses." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const context = await authorize();
  if ("response" in context) return context.response;

  let body: { expiresInDays?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (
    !Number.isInteger(body.expiresInDays) ||
    (body.expiresInDays as number) < 1 ||
    (body.expiresInDays as number) > MAX_LINK_DAYS
  ) {
    return NextResponse.json(
      { error: `Choose an expiry between 1 and ${MAX_LINK_DAYS} days.` },
      { status: 400 }
    );
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(
    Date.now() + (body.expiresInDays as number) * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data, error } = await context.serviceRole
    .from("sponsor_analytics_links")
    .insert({
      token_hash: tokenHash,
      encrypted_token: encryptSponsorToken(token),
      created_by: context.user.id,
      expires_at: expiresAt,
    })
    .select("id, created_at, expires_at, revoked_at")
    .single();
  if (error) {
    console.error("Could not create sponsor analytics link", error);
    return NextResponse.json({ error: "Could not create sponsor link" }, { status: 500 });
  }

  await writeAdminAuditEvent(context.serviceRole, {
    actorId: context.user.id,
    action: "analytics.sponsor_link_created",
    targetType: "sponsor_analytics_link",
    targetId: data.id,
    details: { expires_in_days: body.expiresInDays as number },
  });

  return NextResponse.json({
    link: {
      ...data,
      url: `${request.nextUrl.origin}/sponsor/analytics/${token}`,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const context = await authorize();
  if ("response" in context) return context.response;

  let body: { id?: unknown; action?: unknown };
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    body = parsed as { id?: unknown; action?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.id !== "string" || !UUID_PATTERN.test(body.id)) {
    return NextResponse.json({ error: "Invalid link identifier" }, { status: 400 });
  }

  if (body.action === "delete") {
    const deletedAt = new Date().toISOString();
    const { data, error } = await context.serviceRole
      .from("sponsor_analytics_links")
      .delete()
      .eq("id", body.id)
      .or(`revoked_at.not.is.null,expires_at.lte.${deletedAt}`)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("Could not delete inactive sponsor analytics link", error);
      return NextResponse.json({ error: "Could not delete sponsor link" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { error: "Only revoked or expired sponsor links can be deleted." },
        { status: 409 }
      );
    }

    await writeAdminAuditEvent(context.serviceRole, {
      actorId: context.user.id,
      action: "analytics.sponsor_link_deleted",
      targetType: "sponsor_analytics_link",
      targetId: data.id,
    });
    return NextResponse.json({ success: true });
  }
  if (body.action !== undefined && body.action !== "revoke") {
    return NextResponse.json({ error: "Invalid link action" }, { status: 400 });
  }

  const revokedAt = new Date().toISOString();
  const { data, error } = await context.serviceRole
    .from("sponsor_analytics_links")
    .update({ revoked_at: revokedAt })
    .eq("id", body.id)
    .is("revoked_at", null)
    .gt("expires_at", revokedAt)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Could not revoke sponsor analytics link", error);
    return NextResponse.json({ error: "Could not revoke sponsor link" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Active sponsor link not found" }, { status: 404 });
  }

  await writeAdminAuditEvent(context.serviceRole, {
    actorId: context.user.id,
    action: "analytics.sponsor_link_revoked",
    targetType: "sponsor_analytics_link",
    targetId: data.id,
  });

  return NextResponse.json({ success: true });
}
