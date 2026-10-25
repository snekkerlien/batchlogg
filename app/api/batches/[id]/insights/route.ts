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
      "id, name, type, status, startdato, secondary_startdate, conditioning_startdate, finished_date, packaged_at, og, fg, abv, volume_l, boil_volume_l, packaged_volume_l, packaging_method, bottle_volume_l, keg_volume_l, package_count, carbonation_method, target_carbonation_volumes, priming_sugar_g, tasting_notes, finished_notes, recipe_id, recipe_snapshot, beer_subtype, beer_style, kit_url, malts, hops, dry_hops, boil_time, yeast, base_liquid, base_liquid_amount, honey_type, honey_amount, fruits, juice_type, sugar_amount, ingredients, steps, additives, full_process, notes, secondary_additions, secondary_notes, conditioning_notes, ibu, ebc"
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

  const [readingsResult, conditioningResult, notesResult] = await Promise.all([
    serviceRole
      .from("sg_readings")
      .select("id, sg, created_at")
      .eq("batch_id", params.id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    serviceRole
      .from("batch_conditioning_entries")
      .select("id, entry_type, occurred_at, details, notes")
      .eq("batch_id", params.id)
      .order("occurred_at", { ascending: true })
      .order("created_at", { ascending: true }),
    serviceRole
      .from("batch_notes")
      .select("id, note, image_url, created_at")
      .eq("batch_id", params.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  if (readingsResult.error) {
    console.error("Could not load batch gravity history", readingsResult.error);
    return NextResponse.json(
      { error: "Could not load batch gravity history." },
      { status: 500 }
    );
  }
  if (notesResult.error) {
    console.error("Could not load batch notes for insights", notesResult.error);
    return NextResponse.json(
      { error: "Could not load batch notes." },
      { status: 500 }
    );
  }

  const conditioningMigrationMissing =
    conditioningResult.error &&
    ["42P01", "42703", "PGRST204", "PGRST205"].includes(
      conditioningResult.error.code ?? ""
    );
  if (conditioningResult.error && !conditioningMigrationMissing) {
    console.error(
      "Could not load batch conditioning activity",
      conditioningResult.error
    );
    return NextResponse.json(
      { error: "Could not load batch conditioning activity." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    batch,
    readings: readingsResult.data ?? [],
    conditioningEntries: conditioningResult.data ?? [],
    conditioningActivityAvailable: !conditioningMigrationMissing,
    notes: notesResult.data ?? [],
  });
}
