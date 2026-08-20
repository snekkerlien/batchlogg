import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase } = createRouteHandlerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json({ user });
}
