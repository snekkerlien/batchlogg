import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";
import { premiumGateResponse } from "@/lib/auth/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    return NextResponse.json({
      batches: fallback.data ?? [],
      lifecycleMigrationRequired: true,
    });
  }
  if (error) {
    console.error("Could not load brewing insights batches", error);
    return NextResponse.json({ error: "Could not load brewing insights" }, { status: 500 });
  }

  return NextResponse.json({
    batches: data ?? [],
    lifecycleMigrationRequired: false,
  });
}
