import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { hasPremiumAccess } from "@/lib/auth/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAuthorizedBatches(
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"],
  userId: string,
  requestedIds: string[]
) {
  if (requestedIds.length > 500) {
    return { error: "Too many batches requested", status: 400 as const };
  }

  const { data: batches, error } = await serviceRole
    .from("batches")
    .select("id, user_id, aktivt_kar")
    .in("id", requestedIds);
  if (error) {
    console.error("Could not load batches for SG access", error);
    return { error: "Could not load batches", status: 500 as const };
  }
  if ((batches ?? []).length !== requestedIds.length) {
    return { error: "One or more batches were not found", status: 404 as const };
  }

  const sharedVesselIds = [
    ...new Set(
      (batches ?? [])
        .filter((batch) => batch.user_id !== userId)
        .map((batch) => batch.aktivt_kar)
        .filter((id): id is string => typeof id === "string")
    ),
  ];
  const { data: shares, error: sharesError } = sharedVesselIds.length
    ? await serviceRole
        .from("kar_contributors")
        .select("kar_id")
        .eq("user_id", userId)
        .in("kar_id", sharedVesselIds)
    : { data: [], error: null };
  if (sharesError) {
    console.error("Could not verify shared-vessel SG access", sharesError);
    return { error: "Could not verify batch access", status: 500 as const };
  }

  const sharedSet = new Set((shares ?? []).map((share) => share.kar_id));
  if (
    (batches ?? []).some(
      (batch) => batch.user_id !== userId && (!batch.aktivt_kar || !sharedSet.has(batch.aktivt_kar))
    )
  ) {
    return { error: "One or more batches were not found", status: 404 as const };
  }

  const ownerIds = [...new Set((batches ?? []).map((batch) => batch.user_id))];
  for (const ownerId of ownerIds) {
    if (!(await hasPremiumAccess(serviceRole, ownerId))) {
      return { error: "This feature requires Premium.", status: 403 as const };
    }
  }

  return { batches: batches ?? [] };
}

export async function GET(request: Request) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const url = new URL(request.url);
  const batchId = url.searchParams.get("batchId");
  const { data: ownedBatches, error: batchesError } = batchId
    ? { data: [{ id: batchId }], error: null }
    : await serviceRole
        .from("batches")
        .select("id")
        .eq("user_id", user.id)
        .limit(5000);
  if (batchesError) {
    console.error("Could not load batches for SG history", batchesError);
    return NextResponse.json({ error: "Could not load SG history" }, { status: 500 });
  }

  const batchIds = [...new Set((ownedBatches ?? []).map((batch) => batch.id))];
  if (batchIds.length === 0) return NextResponse.json({ readings: [] });
  const access = await getAuthorizedBatches(serviceRole, user.id, batchIds);
  if ("error" in access) {
    return NextResponse.json(
      { error: access.error, upgradeUrl: access.status === 403 ? "/premium" : undefined },
      { status: access.status }
    );
  }

  const { data, error } = await serviceRole
    .from("sg_readings")
    .select("id, batch_id, sg, created_at")
    .in("batch_id", batchIds)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Could not load SG readings", error);
    return NextResponse.json({ error: "Could not load SG readings" }, { status: 500 });
  }
  return NextResponse.json({ readings: data ?? [] });
}

export async function POST(req: Request) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { batchId?: unknown; sg?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.batchId !== "string" ||
    body.batchId.length === 0 ||
    typeof body.sg !== "number" ||
    !Number.isFinite(body.sg) ||
    body.sg <= 0
  ) {
    return NextResponse.json(
      { error: "A valid batchId and positive SG value are required" },
      { status: 400 }
    );
  }

  const { data: batch, error: batchError } = await serviceRole
    .from("batches")
    .select("id, user_id, aktivt_kar")
    .eq("id", body.batchId)
    .maybeSingle();

  if (batchError) {
    return NextResponse.json({ error: batchError.message }, { status: 500 });
  }

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const access = await getAuthorizedBatches(serviceRole, user.id, [batch.id]);
  if ("error" in access) {
    return NextResponse.json(
      { error: access.error, upgradeUrl: access.status === 403 ? "/premium" : undefined },
      { status: access.status }
    );
  }

  const { data, error } = await serviceRole
    .from("sg_readings")
    .insert({ batch_id: batch.id, sg: body.sg });

  if (error) {
    console.error("Failed to insert SG reading", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
