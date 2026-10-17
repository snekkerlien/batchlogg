import { NextRequest, NextResponse } from "next/server";
import { premiumGateResponse } from "@/lib/auth/plan";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  let text =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : JSON.stringify(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, serviceRole } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const denied = await premiumGateResponse(serviceRole, user.id);
  if (denied) return denied;

  const format = request.nextUrl.searchParams.get("format") ?? "json";
  if (format !== "json" && format !== "csv") {
    return NextResponse.json({ error: "Choose JSON or CSV format" }, { status: 400 });
  }
  const { data: recipe, error } = await serviceRole
    .from("recipes")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("Could not load recipe for export", error);
    return NextResponse.json({ error: "Could not export recipe" }, { status: 500 });
  }
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  const safeName = String(recipe.name || "recipe").replace(/[^a-z0-9_-]+/gi, "-") || "recipe";
  if (format === "json") {
    return new NextResponse(JSON.stringify(recipe, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const headers = Object.keys(recipe);
  const row = headers.map((key) => csvCell(recipe[key]));
  const csv = [headers.map(csvCell).join(","), row.join(",")].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
