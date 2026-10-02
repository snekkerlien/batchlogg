import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const { supabase } = supabaseServer();
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

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("id")
    .eq("id", body.batchId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (batchError) {
    return NextResponse.json({ error: batchError.message }, { status: 500 });
  }

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("sg_readings")
    .insert({ batch_id: batch.id, sg: body.sg });

  if (error) {
    console.error("Failed to insert SG reading", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
