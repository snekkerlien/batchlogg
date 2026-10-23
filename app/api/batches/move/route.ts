import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE_STATUSES = ["Aktiv", "Sekundær", "secondary", "Conditioning"];

export async function POST(request: NextRequest) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("batchId" in body) ||
    typeof body.batchId !== "string" ||
    !UUID_PATTERN.test(body.batchId) ||
    !("sourceVesselId" in body) ||
    typeof body.sourceVesselId !== "string" ||
    !UUID_PATTERN.test(body.sourceVesselId) ||
    !("targetVesselId" in body) ||
    typeof body.targetVesselId !== "string" ||
    !UUID_PATTERN.test(body.targetVesselId) ||
    body.sourceVesselId === body.targetVesselId
  ) {
    return NextResponse.json(
      { error: "Select a valid active batch and a different target vessel." },
      { status: 400 }
    );
  }

  const { data: vessels, error: vesselsError } = await serviceRole
    .from("kar")
    .select("id")
    .eq("user_id", user.id)
    .in("id", [body.sourceVesselId, body.targetVesselId]);
  if (vesselsError) {
    console.error("Could not verify vessels for batch move", vesselsError);
    return NextResponse.json(
      { error: "Could not verify vessel access." },
      { status: 500 }
    );
  }
  if (vessels?.length !== 2) {
    return NextResponse.json(
      { error: "Only your own vessels can be used for this move." },
      { status: 403 }
    );
  }

  const { data: batch, error: batchError } = await serviceRole
    .from("batches")
    .select("id, user_id, aktivt_kar, status")
    .eq("id", body.batchId)
    .eq("user_id", user.id)
    .eq("aktivt_kar", body.sourceVesselId)
    .in("status", ACTIVE_STATUSES)
    .maybeSingle();
  if (batchError) {
    console.error("Could not load batch for vessel move", batchError);
    return NextResponse.json(
      { error: "Could not load the active batch." },
      { status: 500 }
    );
  }
  if (!batch) {
    return NextResponse.json(
      { error: "The batch is no longer in that vessel." },
      { status: 409 }
    );
  }

  const { data: occupied, error: occupiedError } = await serviceRole
    .from("batches")
    .select("id")
    .eq("aktivt_kar", body.targetVesselId)
    .in("status", ACTIVE_STATUSES)
    .limit(1);
  if (occupiedError) {
    console.error("Could not check destination vessel", occupiedError);
    return NextResponse.json(
      { error: "Could not check whether the destination vessel is empty." },
      { status: 500 }
    );
  }
  if (occupied?.length) {
    return NextResponse.json(
      { error: "That vessel already contains an active batch." },
      { status: 409 }
    );
  }

  const { data: movedBatch, error: moveError } = await serviceRole
    .from("batches")
    .update({ aktivt_kar: body.targetVesselId })
    .eq("id", batch.id)
    .eq("user_id", user.id)
    .eq("aktivt_kar", body.sourceVesselId)
    .select("id")
    .maybeSingle();
  if (moveError) {
    console.error("Could not move batch to destination vessel", moveError);
    return NextResponse.json(
      { error: "Could not move the batch. Please try again." },
      { status: 500 }
    );
  }
  if (!movedBatch) {
    return NextResponse.json(
      { error: "The batch changed before it could be moved. Refresh and try again." },
      { status: 409 }
    );
  }

  const targetStatus =
    batch.status === "Aktiv"
      ? "Aktiv"
      : batch.status === "Conditioning"
        ? "Conditioning"
        : "Sekundær";
  const { error: targetStatusError } = await serviceRole
    .from("kar")
    .update({ status: targetStatus })
    .eq("id", body.targetVesselId)
    .eq("user_id", user.id);
  if (targetStatusError) {
    console.error("Could not update destination vessel status", targetStatusError);
    return NextResponse.json(
      { error: "The batch moved, but vessel status did not update. Refresh the dashboard." },
      { status: 500 }
    );
  }

  const { error: sourceStatusError } = await serviceRole
    .from("kar")
    .update({ status: "Ledig" })
    .eq("id", body.sourceVesselId)
    .eq("user_id", user.id);
  if (sourceStatusError) {
    console.error("Could not update source vessel status", sourceStatusError);
    return NextResponse.json(
      { error: "The batch moved, but vessel status did not update. Refresh the dashboard." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
