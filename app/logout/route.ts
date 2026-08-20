import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "../../lib/supabase/supabaseServerFinal";

export async function POST(req: Request) {
  const { supabase, responseHeaders } = createRouteHandlerClient(req);

  // Logg ut bruker
  await supabase.auth.signOut();

  // Redirect til login (relative URL)
  const res = new NextResponse(null, {
    status: 302,
  });

  // Sett cookies riktig (må gjøres etter at res er laget)
  responseHeaders.forEach((value, key) => {
    res.headers.set(key, value);
  });

  // Sett redirect
  res.headers.set("Location", "/auth/login");

  return res;
}
