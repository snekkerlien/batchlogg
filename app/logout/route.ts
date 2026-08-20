export const runtime = "edge";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const { supabase } = createRouteHandlerClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/auth/login", req.url));
}
