import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const { supabase, responseHeaders } = createRouteHandlerClient(req);

  // Hent session (riktig metode i route handlers)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.user) {
    const res = new NextResponse(
      JSON.stringify({ error: "Not logged in" }),
      { status: 401 }
    );

    responseHeaders.forEach((value, key) => res.headers.set(key, value));
    return res;
  }

  const user = session.user;

  // Hent body
  const body = await req.json();
  const ids: number[] = body.ids ?? [];

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
  }

  // Slett kar som tilhører brukeren
  const { error } = await supabase
    .from("kar")
    .delete()
    .in("id", ids)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Returner suksess + sett cookies riktig
  const res = NextResponse.json({ success: true });

  responseHeaders.forEach((value, key) => {
    res.headers.set(key, value);
  });

  return res;
}
