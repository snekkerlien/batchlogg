import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const { supabase, responseHeaders } = createRouteHandlerClient(req);

  // Hent session (riktig metode i route handlers)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.user) {
    const res = new NextResponse(null, { status: 302 });
    responseHeaders.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Location", "/auth/login");
    return res;
  }

  const user = session.user;

  // Opprett nytt kar
  await supabase.from("kar").insert({
    user_id: user.id,
  });

  // Redirect tilbake til dashboard (relative URL)
  const res = new NextResponse(null, { status: 302 });

  // Sett cookies riktig
  responseHeaders.forEach((value, key) => {
    res.headers.set(key, value);
  });

  res.headers.set("Location", "/dashboard");

  return res;
}
