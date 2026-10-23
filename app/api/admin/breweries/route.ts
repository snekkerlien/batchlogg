import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { getMembershipRole, hasPermission } from "@/lib/auth/permissions";
import { writeAdminAuditEvent } from "@/lib/admin/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize() {
  const { supabase, serviceRole } = supabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const role = await getMembershipRole(supabase, user);
  return hasPermission(role, "manage_users") ? { user, serviceRole } : null;
}

export async function GET() {
  const context = await authorize();
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [{ data: accounts, error: accountsError }, { data: reports, error: reportsError }] =
    await Promise.all([
      context.serviceRole.from("brewery_accounts").select("*").order("created_at", { ascending: false }),
      context.serviceRole
        .from("brewery_review_reports")
        .select("id, review_id, reporter_id, reason, status, reviewed_by, reviewed_at, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
  if (accountsError || reportsError) {
    console.error("Could not load brewery admin data", accountsError || reportsError);
    return NextResponse.json({ error: "Could not load brewery admin data." }, { status: 500 });
  }
  const ownerIds = [...new Set((accounts ?? []).map((account) => account.owner_id))];
  const { data: owners, error: ownersError } = ownerIds.length
    ? await context.serviceRole.from("profiles").select("id, username").in("id", ownerIds)
    : { data: [], error: null };
  if (ownersError) {
    console.error("Could not load brewery owners", ownersError);
    return NextResponse.json({ error: "Could not load brewery owners." }, { status: 500 });
  }
  const ownerNames = new Map((owners ?? []).map((owner) => [owner.id, owner.username]));
  const reviewIds = [...new Set((reports ?? []).map((report) => report.review_id))];
  const { data: reviews, error: reviewsError } = reviewIds.length
    ? await context.serviceRole
        .from("brewery_product_reviews")
        .select("id, product_id, user_id, rating, title, body, status, created_at")
        .in("id", reviewIds)
    : { data: [], error: null };
  if (reviewsError) {
    console.error("Could not load reported brewery reviews", reviewsError);
    return NextResponse.json({ error: "Could not load reported reviews." }, { status: 500 });
  }
  const productIds = [...new Set((reviews ?? []).map((review) => review.product_id))];
  const { data: products, error: productsError } = productIds.length
    ? await context.serviceRole.from("brewery_products").select("id, name, brewery_id").in("id", productIds)
    : { data: [], error: null };
  if (productsError) {
    console.error("Could not load reported review products", productsError);
    return NextResponse.json({ error: "Could not load reported review details." }, { status: 500 });
  }
  const accountIds = [...new Set((products ?? []).map((product) => product.brewery_id))];
  const { data: breweries, error: breweriesError } = accountIds.length
    ? await context.serviceRole.from("brewery_accounts").select("id, name, slug").in("id", accountIds)
    : { data: [], error: null };
  if (breweriesError) {
    console.error("Could not load reported review breweries", breweriesError);
    return NextResponse.json({ error: "Could not load reported review details." }, { status: 500 });
  }
  const productById = new Map((products ?? []).map((item) => [item.id, item]));
  const breweryById = new Map((breweries ?? []).map((item) => [item.id, item]));
  const reviewById = new Map((reviews ?? []).map((item) => [item.id, item]));
  return NextResponse.json({
    accounts: (accounts ?? []).map((account) => ({
      ...account,
      owner_username: ownerNames.get(account.owner_id) || "Unknown user",
    })),
    reports: (reports ?? []).map((report) => {
      const review = reviewById.get(report.review_id);
      const product = review ? productById.get(review.product_id) : null;
      const brewery = product ? breweryById.get(product.brewery_id) : null;
      return { ...report, review: review ?? null, product: product ?? null, brewery: brewery ?? null };
    }),
  });
}

export async function PATCH(request: NextRequest) {
  const context = await authorize();
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const action = body.action;
  if (action === "review") {
    if (
      typeof body.reportId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(body.reportId) ||
      !["under_review", "action_taken", "closed"].includes(String(body.status))
    ) return NextResponse.json({ error: "Invalid review report update." }, { status: 400 });

    const { data: report, error } = await context.serviceRole
      .from("brewery_review_reports")
      .update({
        status: body.status,
        reviewed_by: context.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", body.reportId)
      .select("id, review_id")
      .maybeSingle();
    if (error) {
      console.error("Could not update brewery review report", error);
      return NextResponse.json({ error: "Could not update review report." }, { status: 500 });
    }
    if (!report) return NextResponse.json({ error: "Review report not found." }, { status: 404 });
    if (body.status === "action_taken") {
      const { error: hideError } = await context.serviceRole
        .from("brewery_product_reviews")
        .update({ status: "hidden" })
        .eq("id", report.review_id);
      if (hideError) {
        console.error("Report updated but review could not be hidden", hideError);
        return NextResponse.json({ error: "Report was updated, but the review could not be hidden." }, { status: 500 });
      }
    }
    if (!(await writeAdminAuditEvent(context.serviceRole, {
      actorId: context.user.id,
      action: "brewery.review_report_updated",
      targetType: "brewery_review_report",
      targetId: report.id,
      details: { status: String(body.status) },
    }))) return NextResponse.json({ error: "Report was updated, but the audit log could not be updated." }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const validAction = ["approve", "reject", "suspend", "grant", "revoke_grant"].includes(String(action));
  if (!validAction || typeof body.breweryId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.breweryId)) {
    return NextResponse.json({ error: "Invalid brewery action." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const update: Record<string, string | null> = {};
  if (action === "approve") {
    update.status = "approved";
    update.approved_by = context.user.id;
    update.approved_at = now;
  } else if (action === "reject") {
    update.status = "rejected";
  } else if (action === "suspend") {
    update.status = "suspended";
  } else if (action === "grant") {
    const expiresAt = body.expiresAt === "" || body.expiresAt == null ? null : body.expiresAt;
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (
      (expiresAt !== null &&
        (typeof expiresAt !== "string" || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())) ||
      note.length > 1000
    ) return NextResponse.json({ error: "Enter a valid future expiration date and grant note." }, { status: 400 });
    update.status = "approved";
    update.approved_by = context.user.id;
    update.approved_at = now;
    update.manual_access_granted_by = context.user.id;
    update.manual_access_granted_at = now;
    update.manual_access_expires_at = expiresAt;
    update.manual_access_note = note || null;
  } else {
    update.manual_access_granted_by = null;
    update.manual_access_granted_at = null;
    update.manual_access_expires_at = null;
    update.manual_access_note = null;
  }

  const { data: account, error } = await context.serviceRole
    .from("brewery_accounts")
    .update(update)
    .eq("id", body.breweryId)
    .select("id, name, slug, status, manual_access_granted_at, manual_access_expires_at, stripe_subscription_status")
    .maybeSingle();
  if (error) {
    console.error("Could not update brewery access", error);
    return NextResponse.json({ error: "Could not update brewery access." }, { status: 500 });
  }
  if (!account) return NextResponse.json({ error: "Brewery account not found." }, { status: 404 });

  const { data: products, error: productsError } = await context.serviceRole
    .from("brewery_products")
    .select("id")
    .eq("brewery_id", account.id);
  if (productsError) {
    console.error("Brewery access changed but product routes could not be refreshed", productsError);
    return NextResponse.json({ error: "Brewery access changed, but product cache could not be refreshed." }, { status: 500 });
  }
  if (!(await writeAdminAuditEvent(context.serviceRole, {
    actorId: context.user.id,
    action: `brewery.${String(action)}`,
    targetType: "brewery",
    targetId: account.id,
    details: { name: account.name, status: account.status },
  }))) return NextResponse.json({ error: "Brewery access changed, but the audit log could not be updated." }, { status: 500 });

  return NextResponse.json({ account, productIds: (products ?? []).map((product) => product.id) });
}
