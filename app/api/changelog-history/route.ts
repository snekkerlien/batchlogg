import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { serviceRole } = supabaseServer();

  const { data, error } = await serviceRole
    .from("site_changelog")
    .select("version, entry_date, title, body")
    .order("entry_date", { ascending: false });

  if (error) {
    console.error("Could not load changelog history", error);
    return NextResponse.json({ error: "Could not load changelog history" }, { status: 500 });
  }

  return NextResponse.json({ logs: data });
}
