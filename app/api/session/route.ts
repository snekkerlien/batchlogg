import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabaseServerNew";

export async function GET(req: Request) {
  const { supabase } = createRouteHandlerClient(req);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json({ user });
}
