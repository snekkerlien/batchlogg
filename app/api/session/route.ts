export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/supabaseServerFinal";

export async function GET() {


  // Bruk SSR-klienten (leser cookies automatisk)
  const { supabase } = await supabaseServer();



  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  

  if (!user) {
    
    return NextResponse.json({ user: null });
  }

  

  return NextResponse.json({ user });
}
