import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Allocation = {
  vesselId: string;
  volumeL: number;
};

function isAllocation(value: unknown): value is Allocation {
  if (typeof value !== "object" || value === null) return false;
  if (!("vesselId" in value) || !("volumeL" in value)) return false;
  return (
    typeof value.vesselId === "string" &&
    UUID_PATTERN.test(value.vesselId) &&
    typeof value.volumeL === "number" &&
    Number.isFinite(value.volumeL) &&
    value.volumeL > 0 &&
    /^\d+(?:\.\d{1,4})?$/.test(String(value.volumeL))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: "Invalid batch ID" }, { status: 400 });
  }

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
    !("allocations" in body) ||
    !Array.isArray(body.allocations) ||
    body.allocations.length < 2 ||
    body.allocations.length > 50 ||
    !body.allocations.every(isAllocation)
  ) {
    return NextResponse.json(
      { error: "Choose at least two vessels and enter a valid volume for each." },
      { status: 400 }
    );
  }

  const allocations = body.allocations;
  if (new Set(allocations.map((allocation) => allocation.vesselId)).size !== allocations.length) {
    return NextResponse.json(
      { error: "Each portion must go into a different vessel." },
      { status: 400 }
    );
  }

  const { data, error } = await serviceRole.rpc("split_batch", {
    p_batch_id: params.id,
    p_user_id: user.id,
    p_allocations: allocations,
  });
  if (error) {
    console.error("Could not split batch", error);
    if (["42883", "PGRST202"].includes(error.code ?? "")) {
      return NextResponse.json(
        { error: "Apply the batch-splitting database migration before splitting batches." },
        { status: 503 }
      );
    }

    const knownErrors: Record<string, string> = {
      BATCH_NOT_ACTIVE: "Only an active batch can be split.",
      BATCH_NOT_FOUND: "Batch not found or access denied.",
      INVALID_ALLOCATIONS: "Choose at least two valid vessel allocations.",
      INVALID_VOLUME: "Enter a positive volume with no more than four decimal places.",
      VOLUME_EXCEEDED: "The allocated volumes cannot exceed the source batch volume.",
      VESSEL_UNAVAILABLE: "One of the selected vessels is unavailable.",
      VESSEL_IN_USE: "One of the selected vessels already contains an active batch.",
    };
    const message = knownErrors[error.message ?? ""];
    if (message) return NextResponse.json({ error: message }, { status: 409 });
    if (error.message === "VOLUME_MISMATCH") {
      return NextResponse.json(
        {
          error:
            "The database still requires the full volume to be allocated. Update the split_batch function to record transfer loss, then try again.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Could not split this batch. Please try again." },
      { status: 500 }
    );
  }

  const children =
    data &&
    typeof data === "object" &&
    "children" in data &&
    Array.isArray(data.children)
      ? data.children
      : [];
  return NextResponse.json({ children });
}
