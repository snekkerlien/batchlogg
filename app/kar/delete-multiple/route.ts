export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const { supabase } = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const requestedIds =
    typeof body === "object" && body !== null && "ids" in body
      ? body.ids
      : null;
  const ids = Array.isArray(requestedIds)
    ? [
        ...new Set(
          requestedIds.filter((id): id is string => typeof id === "string")
        ),
      ]
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

  const { data: vessels, error: vesselsError } = await supabase
    .from("kar")
    .select("id")
    .in("id", ids)
    .eq("user_id", user.id);

  if (vesselsError) {
    console.error("Could not load selected vessels for deletion", vesselsError);
    return NextResponse.json(
      { error: "Could not load selected vessels" },
      { status: 500 }
    );
  }

  const ownedVesselIds = (vessels ?? []).map((vessel) => vessel.id);
  if (ownedVesselIds.length === 0) {
    return NextResponse.json(
      { error: "No selected vessels were found" },
      { status: 404 }
    );
  }

  const { data: activeBatches, error: batchesError } = await supabase
    .from("batches")
    .select("id")
    .eq("user_id", user.id)
    .in("aktivt_kar", ownedVesselIds)
    .in("status", ["Aktiv", "Sekundær", "secondary", "Conditioning"]);

  if (batchesError) {
    console.error("Could not load active batches for vessel deletion", batchesError);
    return NextResponse.json(
      { error: "Could not load active batches" },
      { status: 500 }
    );
  }

  const activeBatchIds = (activeBatches ?? []).map((batch) => batch.id);
  if (activeBatchIds.length > 0) {
    const { error: notesError } = await supabase
      .from("batch_notes")
      .delete()
      .in("batch_id", activeBatchIds);
    if (notesError) {
      console.error("Could not delete notes for cancelled batches", notesError);
      return NextResponse.json(
        { error: "Could not delete active batch notes" },
        { status: 500 }
      );
    }

    const { data: deletedBatches, error: deleteBatchesError } = await supabase
      .from("batches")
      .delete()
      .eq("user_id", user.id)
      .in("id", activeBatchIds)
      .select("id");

    if (deleteBatchesError) {
      console.error("Could not cancel active batches before vessel deletion", deleteBatchesError);
      return NextResponse.json(
        { error: "Could not cancel active batches" },
        { status: 500 }
      );
    }
    if ((deletedBatches ?? []).length !== activeBatchIds.length) {
      return NextResponse.json(
        { error: "One or more active batches could not be cancelled" },
        { status: 409 }
      );
    }
  }

  const { data: deletedVessels, error: deleteVesselsError } = await supabase
    .from("kar")
    .delete()
    .in("id", ownedVesselIds)
    .eq("user_id", user.id)
    .select("id");

  if (deleteVesselsError) {
    console.error("Could not delete selected vessels", deleteVesselsError);
    return NextResponse.json(
      { error: "Could not delete selected vessels" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    deletedVesselIds: (deletedVessels ?? []).map((vessel) => vessel.id),
    cancelledBatchCount: activeBatchIds.length,
  });
}
