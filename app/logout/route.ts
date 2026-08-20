export const runtime = "edge";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../lib/supabase/supabaseServerFinal";

export async function POST() {
  const { supabase } = createRouteHandlerClient();

  await supabase.auth.signOut();

  return NextResponse.redirect("/auth/login");
}
