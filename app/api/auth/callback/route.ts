import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const { supabase } = supabaseServer();
  const body = await req.json();

  if (!body.session) {
    console.error("Callback error: Missing session");
    return NextResponse.json({ error: "Missing session" }, { status: 400 });
  }

  await supabase.auth.setSession(body.session);

  return NextResponse.json({ ok: true });
}
