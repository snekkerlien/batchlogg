export const runtime = "nodejs";

import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json({ user });
}
