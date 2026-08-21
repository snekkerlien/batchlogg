export const runtime = "edge";

import { NextResponse } from "next/server";
import { supabaseServer } from "../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  await supabaseServer.auth.signOut();
  return NextResponse.redirect(new URL("/auth/login", req.url));
}
