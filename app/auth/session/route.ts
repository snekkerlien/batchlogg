export const runtime = "nodejs";

import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";
import { NextResponse } from "next/server";

export async function GET() {
  

  // Bruk SSR-klienten (leser cookies automatisk)
  const { supabase } = supabaseServer();

  

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  

  if (!user) {
   
    return NextResponse.json({ user: null });
  }

  

  return NextResponse.json({ user });
}
