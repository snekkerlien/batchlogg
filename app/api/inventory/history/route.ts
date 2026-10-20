import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

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

  const { data, error } = await serviceRole
    .from("inventory_movements")
    .select(
      "id, item_name, category, movement_type, quantity_change, balance_after, unit, batch_id, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    console.error("Could not load inventory movement history", error);
    if (["42P01", "PGRST205"].includes(error.code ?? "")) {
      return NextResponse.json(
        { error: "Apply the inventory movement ledger migration to enable stock history." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not load inventory movement history" },
      { status: 500 }
    );
  }

  return NextResponse.json({ movements: data ?? [] });
}
