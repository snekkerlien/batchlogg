import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const { supabase } = supabaseServer();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A session is required" }, { status: 400 });
  }

  const session = "session" in body ? body.session : undefined;

  if (session === null) {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      console.error("Could not clear synchronized Supabase session", error);
      return NextResponse.json({ error: "Could not clear session" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (
    typeof session !== "object" ||
    session === null ||
    Array.isArray(session) ||
    !("access_token" in session) ||
    !("refresh_token" in session) ||
    typeof session.access_token !== "string" ||
    typeof session.refresh_token !== "string"
  ) {
    return NextResponse.json({ error: "A valid session is required" }, { status: 400 });
  }

  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) {
    console.error("Could not synchronize Supabase session", error);
    return NextResponse.json({ error: "Could not synchronize session" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
