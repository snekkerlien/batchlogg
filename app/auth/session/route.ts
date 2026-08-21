import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { NextResponse } from "next/server";

export async function GET() {
  // Hent bruker fra JWT som kommer fra klienten
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  return NextResponse.json({ user });
}
