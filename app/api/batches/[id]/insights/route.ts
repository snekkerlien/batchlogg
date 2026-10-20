import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
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

  const { data: batch, error } = await serviceRole
    .from("batches")
    .select(
      "id, name, type, status, startdato, finished_date, og, fg, abv, volume_l, packaged_volume_l, packaging_method, bottle_volume_l, keg_volume_l, package_count, carbonation_method, target_carbonation_volumes, priming_sugar_g, tasting_notes, finished_notes, recipe_id, recipe_snapshot"
    )
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Could not load batch insights", error);
    if (["42703", "PGRST204"].includes(error.code ?? "")) {
      return NextResponse.json(
        { error: "Apply the batch lifecycle migration to view batch insights." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not load batch insights" },
      { status: 500 }
    );
  }
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  if (
    !batch.finished_date ||
    !["finished", "avsluttet", "ferdig"].includes(
      String(batch.status ?? "").toLowerCase()
    )
  ) {
    return NextResponse.json(
      { error: "Batch insights are available after packaging and finishing the batch." },
      { status: 409 }
    );
  }

  return NextResponse.json({ batch });
}
