import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { premiumGateResponse } from "@/lib/auth/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadConditioningRackLosses(
  serviceRole: ReturnType<typeof supabaseServer>["serviceRole"],
  userId: string
) {
  const losses: Record<string, number> = {};
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await serviceRole
      .from("batch_conditioning_entries")
      .select("batch_id, details")
      .eq("user_id", userId)
      .eq("entry_type", "rack")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) {
      if (["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code ?? "")) {
        return { losses: {}, migrationRequired: true };
      }
      throw new Error("Could not load conditioning rack losses");
    }

    for (const entry of data ?? []) {
      const details = entry.details as Record<string, unknown> | null;
      const rawLoss = details?.volume_loss_l;
      if (rawLoss === undefined || rawLoss === null || rawLoss === "") continue;
      const loss = Number(rawLoss);
      if (!Number.isFinite(loss) || loss < 0) continue;
      losses[entry.batch_id] = (losses[entry.batch_id] ?? 0) + loss;
    }
    if (!data || data.length < pageSize) break;
    offset += pageSize;
  }
  return { losses, migrationRequired: false };
}

export async function GET() {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const accessDenied = await premiumGateResponse(serviceRole, user.id);
  if (accessDenied) return accessDenied;

  const { data, error } = await serviceRole
    .from("batches")
    .select("id, name, type, status, startdato, finished_date, og, fg, abv, volume_l, packaged_volume_l, recipe_snapshot")
    .eq("user_id", user.id)
    .order("startdato", { ascending: false })
    .limit(5000);

  if (error && ["42703", "PGRST204"].includes(error.code ?? "")) {
    console.warn("Batch lifecycle migration is required for packaging insights.");
    const fallback = await serviceRole
      .from("batches")
      .select("id, name, type, status, startdato, finished_date, og, fg, abv, volume_l")
      .eq("user_id", user.id)
      .order("startdato", { ascending: false })
      .limit(5000);
    if (fallback.error) {
      console.error("Could not load brewing insights batches", fallback.error);
      return NextResponse.json({ error: "Could not load brewing insights" }, { status: 500 });
    }
    let conditioning: Awaited<ReturnType<typeof loadConditioningRackLosses>>;
    try {
      conditioning = await loadConditioningRackLosses(
        serviceRole,
        user.id
      );
    } catch (loadError) {
      console.error("Could not load conditioning rack losses", loadError);
      return NextResponse.json(
        { error: "Could not load brewing insights" },
        { status: 500 }
      );
    }
    return NextResponse.json({
      batches: fallback.data ?? [],
      lifecycleMigrationRequired: true,
      conditioningRackLosses: conditioning.losses,
      conditioningActivityMigrationRequired: conditioning.migrationRequired,
    });
  }
  if (error) {
    console.error("Could not load brewing insights batches", error);
    return NextResponse.json({ error: "Could not load brewing insights" }, { status: 500 });
  }

  let conditioning: Awaited<ReturnType<typeof loadConditioningRackLosses>>;
  try {
    conditioning = await loadConditioningRackLosses(
      serviceRole,
      user.id
    );
  } catch (loadError) {
    console.error("Could not load conditioning rack losses", loadError);
    return NextResponse.json(
      { error: "Could not load brewing insights" },
      { status: 500 }
    );
  }
  return NextResponse.json({
    batches: data ?? [],
    lifecycleMigrationRequired: false,
    conditioningRackLosses: conditioning.losses,
    conditioningActivityMigrationRequired: conditioning.migrationRequired,
  });
}
