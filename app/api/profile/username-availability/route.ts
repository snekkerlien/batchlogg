import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim().toLowerCase();

  if (!username || username.length > 64) {
    return NextResponse.json(
      { error: "A username of 1 to 64 characters is required." },
      { status: 400 }
    );
  }

  const pattern = username.replace(/[\\%_*]/g, "\\$&");
  const { serviceRole } = await supabaseServer();
  const { data, error } = await serviceRole
    .from("profiles")
    .select("id")
    .ilike("username", pattern)
    .limit(1);

  if (error) {
    console.error("Could not check username availability", error);
    return NextResponse.json(
      { error: "Could not check username availability." },
      { status: 500 }
    );
  }

  return NextResponse.json({ available: data.length === 0 });
}
