import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function GET() {
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  return NextResponse.json({ user });
}
